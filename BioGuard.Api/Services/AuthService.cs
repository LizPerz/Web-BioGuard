using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using BioGuard.Api.Config;
using BioGuard.Api.DTOs;
using BioGuard.Api.Models;

namespace BioGuard.Api.Services;

public class AuthService
{
    private readonly IMongoDbContext _db;
    private readonly string _jwtKey;
    private readonly string _issuer;
    private readonly string _audience;
    private readonly int _expirationMinutes;
    private readonly int _refreshTokenDays;

    public AuthService(IMongoDbContext db, IConfiguration config)
    {
        _db = db;
        _jwtKey = config["Jwt:Key"] is { Length: > 0 } k ? k
            : Environment.GetEnvironmentVariable("JWT_SECRET_KEY")
            ?? throw new InvalidOperationException("JWT secret key not configured.");
        _issuer = config["Jwt:Issuer"] ?? "BioGuardApi";
        _audience = config["Jwt:Audience"] ?? "BioGuardApp";
        _expirationMinutes = int.Parse(config["Jwt:ExpirationMinutes"] ?? "60");
        _refreshTokenDays = int.Parse(config["Jwt:RefreshTokenDays"] ?? "7");
    }

    // ── Register ───────────────────────────────────────────

    public async Task<AuthResponse?> RegisterWebAsync(RegisterWebRequest request)
    {
        var exists = await _db.FindFirstOrDefaultAsync(_db.UsuariosWeb, u => u.Correo == request.Correo);
        if (exists != null && exists.Activo) return null;

        var plan = await _db.FindFirstOrDefaultAsync(_db.Planes, p => p.Nombre == request.PlanNombre);
        if (plan == null) return null;

        string userId;
        if (exists != null)
        {
            userId = exists.Id;
            var updateUser = Builders<UsuarioWeb>.Update
                .Set(u => u.Nombre, request.Nombre)
                .Set(u => u.ApellidoPaterno, request.ApellidoPaterno)
                .Set(u => u.ApellidoMaterno, request.ApellidoMaterno)
                .Set(u => u.PasswordHash, PasswordHasher.Hash(request.Password))
                .Set(u => u.PlanId, plan.Id);
            await _db.UsuariosWeb.UpdateOneAsync(u => u.Id == userId, updateUser);
        }
        else
        {
            var user = new UsuarioWeb
            {
                Nombre = request.Nombre,
                ApellidoPaterno = request.ApellidoPaterno,
                ApellidoMaterno = request.ApellidoMaterno,
                Correo = request.Correo,
                PasswordHash = PasswordHasher.Hash(request.Password),
                ProveedorAuth = "local",
                PlanId = plan.Id,
                Activo = false,
                FechaRegistro = DateTime.UtcNow
            };
            await _db.UsuariosWeb.InsertOneAsync(user);
            userId = user.Id;
        }

        var codigo = RandomNumberString(6);
        var expira = DateTime.UtcNow.AddMinutes(10);

        var update = Builders<UsuarioWeb>.Update
            .Set(u => u.TwoFactorCode, codigo)
            .Set(u => u.TwoFactorExpira, expira)
            .Set(u => u.TwoFactorVerificado, false);

        await _db.UsuariosWeb.UpdateOneAsync(u => u.Id == userId, update);

        _ = Task.Run(() => SendVerificationEmail(request.Correo, codigo));

        return new AuthResponse("pending_verification", userId, $"{request.Nombre} {request.ApellidoPaterno}", "dueno", plan.Nombre);
    }

    // ── Login Web ──────────────────────────────────────────

    public async Task<AuthResponse?> LoginWebAsync(LoginWebRequest request)
    {
        var user = await _db.FindFirstOrDefaultAsync(_db.UsuariosWeb, u => u.Correo == request.Correo);
        if (user == null || !user.Activo) return null;

        if (!PasswordHasher.Verify(request.Password, user.PasswordHash)) return null;

        var plan = await _db.FindFirstOrDefaultAsync(_db.Planes, p => p.Id == user.PlanId);
        var token = GenerateToken(user.Id, user.Correo, "dueno");

        return new AuthResponse(token, user.Id, $"{user.Nombre} {user.ApellidoPaterno}", "dueno", plan?.Nombre ?? "Sin plan");
    }

    // ── Login Google ───────────────────────────────────────

    public async Task<AuthResponse?> LoginGoogleAsync(LoginGoogleRequest request)
    {
        string? email = await ValidarTokenGoogleAsync(request.IdToken);
        if (email == null) return null;

        var user = await _db.FindFirstOrDefaultAsync(_db.UsuariosWeb, u => u.Correo == email);

        if (user == null)
        {
            var plan = await _db.FindFirstOrDefaultAsync(_db.Planes, p => p.Nombre == "Gratis");
            if (plan == null) return null;

            user = new UsuarioWeb
            {
                Nombre = email.Split('@')[0],
                ApellidoPaterno = "",
                ApellidoMaterno = "",
                Correo = email,
                PasswordHash = "",
                ProveedorAuth = "google",
                GoogleId = request.IdToken,
                PlanId = plan.Id,
                Activo = true,
                FechaRegistro = DateTime.UtcNow
            };

            await _db.UsuariosWeb.InsertOneAsync(user);
        }

        var userPlan = await _db.FindFirstOrDefaultAsync(_db.Planes, p => p.Id == user.PlanId);
        var token = GenerateToken(user.Id, user.Correo, "dueno");

        return new AuthResponse(token, user.Id, $"{user.Nombre} {user.ApellidoPaterno}", "dueno", userPlan?.Nombre ?? "Sin plan");
    }

    // ── Login por Código (Móvil) ───────────────────────────

    public async Task<AuthResponse?> LoginByCodigoAsync(LoginCodigoRequest request)
    {
        var paciente = await _db.FindFirstOrDefaultAsync(_db.Pacientes, p => p.CodigoAccesoQr == request.CodigoAcceso);
        if (paciente != null)
        {
            var token = GenerateToken(paciente.Id, paciente.CodigoAccesoQr, "paciente");
            return new AuthResponse(token, paciente.Id, paciente.Nombre, "paciente", "paciente");
        }

        var cuidador = await _db.FindFirstOrDefaultAsync(_db.Cuidadores, c => c.CodigoAccesoQr == request.CodigoAcceso);
        if (cuidador != null)
        {
            var token = GenerateToken(cuidador.Id, cuidador.CodigoAccesoQr, "cuidador");
            return new AuthResponse(token, cuidador.Id, cuidador.Nombre, "cuidador", "cuidador");
        }

        return null;
    }

    // ── Refresh Token ──────────────────────────────────────

    public async Task<RefreshTokenResponse?> RefreshTokenAsync(RefreshTokenRequest request, string? ip = null)
    {
        var stored = await _db.FindFirstOrDefaultAsync(_db.RefreshTokens, t => t.Token == request.RefreshToken);
        if (stored == null || !stored.IsActive) return null;

        var user = await _db.FindFirstOrDefaultAsync(_db.UsuariosWeb, u => u.Id == stored.UsuarioId);
        if (user == null) return null;

        var newRefreshToken = GenerateRefreshToken();
        var oldRefreshCopy = new RefreshToken
        {
            Id = stored.Id,
            UsuarioId = stored.UsuarioId,
            Token = stored.Token,
            ExpiresAt = stored.ExpiresAt,
            CreatedAt = stored.CreatedAt,
            Ip = stored.Ip,
            ReplacedBy = newRefreshToken
        };

        await RevokeRefreshTokenAsync(oldRefreshCopy);

        await _db.RefreshTokens.InsertOneAsync(new RefreshToken
        {
            UsuarioId = user.Id,
            Token = newRefreshToken,
            ExpiresAt = DateTime.UtcNow.AddDays(_refreshTokenDays),
            Ip = ip
        });

        var accessToken = GenerateToken(user.Id, user.Correo, "dueno");

        return new RefreshTokenResponse(accessToken, newRefreshToken);
    }

    public async Task RevokeRefreshTokenAsync(RefreshToken token)
    {
        var filter = Builders<RefreshToken>.Filter.Where(t =>
            t.Token == token.Token ||
            (token.ReplacedBy != null && t.Token == token.ReplacedBy));

        var update = Builders<RefreshToken>.Update.Set(t => t.RevokedAt, DateTime.UtcNow);

        await _db.RefreshTokens.UpdateManyAsync(filter, update);
    }

    // ── 2FA ────────────────────────────────────────────────

    public async Task<bool> Enviar2FAAsync(Enviar2FARequest request)
    {
        var user = await _db.FindFirstOrDefaultAsync(_db.UsuariosWeb, u => u.Correo == request.Correo);
        if (user == null || !user.Activo) return false;

        var codigo = RandomNumberString(6);
        var expira = DateTime.UtcNow.AddMinutes(10);

        var update = Builders<UsuarioWeb>.Update
            .Set(u => u.TwoFactorCode, codigo)
            .Set(u => u.TwoFactorExpira, expira)
            .Set(u => u.TwoFactorVerificado, false);

        await _db.UsuariosWeb.UpdateOneAsync(u => u.Id == user.Id, update);

        _ = Task.Run(() => SendVerificationEmail(request.Correo, codigo));

        return true;
    }

    public async Task<AuthResponse?> Verificar2FAAsync(Verificar2FARequest request)
    {
        var user = await _db.FindFirstOrDefaultAsync(_db.UsuariosWeb, u => u.Correo == request.Correo);
        if (user == null) return null;

        if (string.IsNullOrEmpty(user.TwoFactorCode)) return null;
        if (user.TwoFactorExpira == null || user.TwoFactorExpira < DateTime.UtcNow) return null;

        var codeMatch = CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(user.TwoFactorCode),
            Encoding.UTF8.GetBytes(request.Codigo));
        if (!codeMatch) return null;

        var update = Builders<UsuarioWeb>.Update
            .Set(u => u.TwoFactorCode, null)
            .Set(u => u.TwoFactorExpira, null)
            .Set(u => u.TwoFactorVerificado, true)
            .Set(u => u.Activo, true);

        await _db.UsuariosWeb.UpdateOneAsync(u => u.Id == user.Id, update);

        var plan = await _db.FindFirstOrDefaultAsync(_db.Planes, p => p.Id == user.PlanId);
        var token = GenerateToken(user.Id, user.Correo, "dueno");

        return new AuthResponse(token, user.Id, $"{user.Nombre} {user.ApellidoPaterno}", "dueno", plan?.Nombre ?? "Sin plan");
    }

    // ── Forgot Password ────────────────────────────────────

    public async Task<bool> ForgotPasswordAsync(ForgotPasswordRequest request)
    {
        var user = await _db.FindFirstOrDefaultAsync(_db.UsuariosWeb, u => u.Correo == request.Correo);
        if (user == null || !user.Activo) return false;

        var token = GenerateRandomToken();
        var expira = DateTime.UtcNow.AddHours(1);

        var update = Builders<UsuarioWeb>.Update
            .Set(u => u.ResetPasswordToken, token)
            .Set(u => u.ResetPasswordExpira, expira);

        await _db.UsuariosWeb.UpdateOneAsync(u => u.Id == user.Id, update);

        _ = Task.Run(() => SendPasswordResetEmail(user.Correo, token));

        return true;
    }

    public async Task<bool> ResetPasswordAsync(ResetPasswordRequest request)
    {
        var user = await _db.FindFirstOrDefaultAsync(_db.UsuariosWeb, u => u.ResetPasswordToken == request.Token);

        if (user == null) return false;
        if (user.ResetPasswordExpira == null || user.ResetPasswordExpira < DateTime.UtcNow) return false;

        var update = Builders<UsuarioWeb>.Update
            .Set(u => u.PasswordHash, PasswordHasher.Hash(request.NuevaPassword))
            .Set(u => u.ResetPasswordToken, null)
            .Set(u => u.ResetPasswordExpira, null);

        await _db.UsuariosWeb.UpdateOneAsync(u => u.Id == user.Id, update);

        return true;
    }

    // ── Cambiar Password (logueado) ────────────────────────

    public async Task<bool> CambiarPasswordAsync(string userId, CambiarPasswordRequest request)
    {
        var user = await _db.FindFirstOrDefaultAsync(_db.UsuariosWeb, u => u.Id == userId);
        if (user == null) return false;

        if (!PasswordHasher.Verify(request.PasswordActual, user.PasswordHash)) return false;

        var update = Builders<UsuarioWeb>.Update
            .Set(u => u.PasswordHash, PasswordHasher.Hash(request.NuevaPassword));

        await _db.UsuariosWeb.UpdateOneAsync(u => u.Id == userId, update);

        return true;
    }

    // ── Helpers ────────────────────────────────────────────

    internal string GenerateToken(string id, string email, string role)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, id),
            new Claim(JwtRegisteredClaimNames.Sub, id),
            new Claim(ClaimTypes.Email, email),
            new Claim(ClaimTypes.Role, role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: _audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_expirationMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    internal string GenerateRefreshToken()
    {
        var bytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes);
    }

    private static string RandomNumberString(int length)
    {
        var numbers = new char[length];
        for (int i = 0; i < length; i++)
            numbers[i] = (char)RandomNumberGenerator.GetInt32('0', '9' + 1);
        return new string(numbers);
    }

    private static string GenerateRandomToken()
    {
        var bytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_");
    }

    private static void SendVerificationEmail(string correo, string codigo)
    {
        var smtpHost = Environment.GetEnvironmentVariable("SMTP_HOST");
        if (string.IsNullOrEmpty(smtpHost))
        {
            Console.WriteLine($"[BioGuard] CODIGO DE VERIFICACION para {correo}: {codigo}");
            return;
        }

        try
        {
            var port = int.Parse(Environment.GetEnvironmentVariable("SMTP_PORT") ?? "587");
            var user = Environment.GetEnvironmentVariable("SMTP_USER") ?? "";
            var pass = Environment.GetEnvironmentVariable("SMTP_PASS") ?? "";

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("BioGuard", user));
            message.To.Add(new MailboxAddress("", correo));
            message.Subject = "BioGuard - Codigo de Verificacion";
            message.Body = new TextPart("html")
            {
                Text = $@"<div style='font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0a0e17;color:#e8ecf2;border-radius:12px;border:1px solid #1e2d4a'>
<h2 style='color:#00e5ff'>BioGuard</h2>
<p>Tu codigo de verificacion es:</p>
<h1 style='font-size:2rem;letter-spacing:8px;color:#00e5ff;text-align:center;margin:24px 0'>{codigo}</h1>
<p style='color:#8899b4'>Este codigo expira en 10 minutos.</p>
<p style='color:#5a6d8a;font-size:0.85rem;margin-top:24px'>Si no solicitaste este codigo, ignora este mensaje.</p>
</div>"
            };

            using var client = new SmtpClient();
            client.Connect(smtpHost, port, SecureSocketOptions.StartTls);
            client.Authenticate(user, pass);
            client.Send(message);
            client.Disconnect(true);

            Console.WriteLine($"[BioGuard] Email enviado a {correo}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[BioGuard] ERROR email: {ex.Message}");
            Console.WriteLine($"[BioGuard] CODIGO DE VERIFICACION para {correo}: {codigo}");
        }
    }

    private static void SendPasswordResetEmail(string correo, string token)
    {
        var smtpHost = Environment.GetEnvironmentVariable("SMTP_HOST");
        if (string.IsNullOrEmpty(smtpHost))
        {
            var resetLink = $"https://bioguard.app/reset-password?token={token}";
            Console.WriteLine($"[BioGuard] PASSWORD RESET para {correo}: {resetLink}");
            return;
        }

        try
        {
            var port = int.Parse(Environment.GetEnvironmentVariable("SMTP_PORT") ?? "587");
            var user = Environment.GetEnvironmentVariable("SMTP_USER") ?? "";
            var pass = Environment.GetEnvironmentVariable("SMTP_PASS") ?? "";
            var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "https://bioguard.app";

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("BioGuard", user));
            message.To.Add(new MailboxAddress("", correo));
            message.Subject = "BioGuard - Restablecer Contraseña";
            message.Body = new TextPart("html")
            {
                Text = $@"<div style='font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0a0e17;color:#e8ecf2;border-radius:12px;border:1px solid #1e2d4a'>
<h2 style='color:#00e5ff'>BioGuard</h2>
<p>Recibimos una solicitud para restablecer tu contraseña.</p>
<p>Haz clic en el siguiente botón para continuar:</p>
<a href='{frontendUrl}/reset-password?token={token}' style='display:inline-block;margin:16px 0;padding:12px 24px;background:#00e5ff;color:#0a0e17;text-decoration:none;border-radius:8px;font-weight:600'>Restablecer Contraseña</a>
<p style='color:#8899b4'>Este enlace expira en 1 hora.</p>
<p style='color:#5a6d8a;font-size:0.85rem;margin-top:24px'>Si no solicitaste este cambio, ignora este mensaje.</p>
</div>"
            };

            using var client = new SmtpClient();
            client.Connect(smtpHost, port, SecureSocketOptions.StartTls);
            client.Authenticate(user, pass);
            client.Send(message);
            client.Disconnect(true);

            Console.WriteLine($"[BioGuard] Password reset email enviado a {correo}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[BioGuard] ERROR password reset email: {ex.Message}");
            var resetLink = $"{Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "https://bioguard.app"}/reset-password?token={token}";
            Console.WriteLine($"[BioGuard] PASSWORD RESET para {correo}: {resetLink}");
        }
    }

    private static async Task<string?> ValidarTokenGoogleAsync(string idToken)
    {
        await Task.CompletedTask;
        return null;
    }
}

// ── PBKDF2 Password Hasher ──────────────────────────────

public static class PasswordHasher
{
    private const int SaltSize = 16;
    private const int KeySize = 32;
    private const int Iterations = 100_000;
    private static readonly HashAlgorithmName Algorithm = HashAlgorithmName.SHA256;

    public static string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var key = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, Algorithm, KeySize);
        return $"{Iterations}.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(key)}";
    }

    public static bool Verify(string password, string hash)
    {
        var parts = hash.Split('.', 3);
        if (parts.Length != 3) return false;
        if (!int.TryParse(parts[0], out var iterations)) return false;

        var salt = Convert.FromBase64String(parts[1]);
        var key = Convert.FromBase64String(parts[2]);
        var computed = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, Algorithm, key.Length);

        return CryptographicOperations.FixedTimeEquals(computed, key);
    }
}
