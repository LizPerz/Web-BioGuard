using MongoDB.Driver;
using BioGuard.Api.Config;
using BioGuard.Api.Models;
using Stripe;
using Stripe.Checkout;

namespace BioGuard.Api.Services;

public class PagosService
{
    private readonly IMongoDbContext _db;
    private readonly UsuariosWebService _usuariosWebService;

    public PagosService(IMongoDbContext db, UsuariosWebService usuariosWebService)
    {
        _db = db;
        _usuariosWebService = usuariosWebService;
    }

    private static string StripeSecretKey()
        => Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY")
           ?? throw new InvalidOperationException("STRIPE_SECRET_KEY no configurada.");

    private static string WebhookSecret()
        => Environment.GetEnvironmentVariable("STRIPE_WEBHOOK_SECRET") ?? string.Empty;

    private static string FrontendBaseUrl()
        => Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:5173";

    /// <summary>
    /// Crea una sesión de pago real en Stripe y guarda el pago en BD.
    /// Devuelve null si el plan no existe o no tiene precio de Stripe.
    /// El plan Gratis se activa de inmediato sin Stripe.
    /// </summary>
    public async Task<Pago?> CrearSesionAsync(string usuarioId, string planNombre, string metodoPago)
    {
        var plan = await _db.FindFirstOrDefaultAsync(_db.Planes, p => p.Nombre == planNombre);
        if (plan == null) return null;

        // Plan Gratis: se activa al instante, sin abrir Stripe
        if (plan.Nombre.Equals("Gratis", StringComparison.OrdinalIgnoreCase))
        {
            var pagoGratis = new Pago
            {
                UsuarioWebId = usuarioId,
                Monto = 0,
                Moneda = plan.PrecioMoneda,
                PlanId = plan.Id,
                Estado = "completado",
                FechaPago = DateTime.UtcNow,
                MetodoPago = "gratis"
            };
            await _db.Pagos.InsertOneAsync(pagoGratis);
            await _usuariosWebService.CambiarPlanAsync(usuarioId, plan.Nombre);
            return pagoGratis;
        }

        if (!string.Equals(metodoPago, "stripe", StringComparison.OrdinalIgnoreCase))
            return null;

        if (string.IsNullOrWhiteSpace(plan.StripePriceId))
            return null;

        StripeConfiguration.ApiKey = StripeSecretKey();

        var options = new SessionCreateOptions
        {
            Mode = "payment",
            SuccessUrl = $"{FrontendBaseUrl()}/pago/exito?session_id={{CHECKOUT_SESSION_ID}}",
            CancelUrl = $"{FrontendBaseUrl()}/pago/cancelado",
            LineItems = new List<SessionLineItemOptions>
            {
                new()
                {
                    Price = plan.StripePriceId,
                    Quantity = 1,
                }
            },
            Metadata = new Dictionary<string, string>
            {
                { "usuarioId", usuarioId },
                { "planNombre", plan.Nombre },
            },
        };

        var service = new SessionService();
        var session = await service.CreateAsync(options);

        var pago = new Pago
        {
            UsuarioWebId = usuarioId,
            Monto = plan.Precio,
            Moneda = plan.PrecioMoneda,
            PlanId = plan.Id,
            StripeSessionId = session.Id,
            StripeCustomerId = session.CustomerId,
            CheckoutUrl = session.Url,
            Estado = "pendiente",
            FechaPago = DateTime.UtcNow,
            MetodoPago = "stripe"
        };

        await _db.Pagos.InsertOneAsync(pago);
        return pago;
    }

    /// <summary>
    /// Procesa el webhook de Stripe. Al confirmarse un pago, activa el plan del usuario.
    /// </summary>
    public async Task<bool> ProcesarWebhookAsync(string json, string signature)
    {
        var secret = WebhookSecret();
        if (string.IsNullOrEmpty(secret))
            return false;

        StripeConfiguration.ApiKey = StripeSecretKey();

        Event stripeEvent;
        try
        {
            stripeEvent = EventUtility.ConstructEvent(json, signature, secret);
        }
        catch (StripeException)
        {
            return false;
        }

        if (stripeEvent.Type == "checkout.session.completed")
        {
            var session = stripeEvent.Data.Object as Session;
            if (session == null) return false;

            string? usuarioId = null;
            string? planNombre = null;
            if (session.Metadata != null)
            {
                session.Metadata.TryGetValue("usuarioId", out usuarioId);
                session.Metadata.TryGetValue("planNombre", out planNombre);
            }

            var pago = await _db.FindFirstOrDefaultAsync(_db.Pagos, p => p.StripeSessionId == session.Id);
            if (pago != null)
            {
                var update = Builders<Pago>.Update
                    .Set(p => p.Estado, "completado")
                    .Set(p => p.StripeCustomerId, session.CustomerId)
                    .Set(p => p.FechaPago, DateTime.UtcNow);
                await _db.Pagos.UpdateOneAsync(p => p.Id == pago.Id, update);
            }

            if (!string.IsNullOrEmpty(usuarioId) && !string.IsNullOrEmpty(planNombre))
            {
                await _usuariosWebService.CambiarPlanAsync(usuarioId, planNombre);
            }
        }

        return true;
    }

    public async Task<List<Pago>> ObtenerHistorialAsync(string usuarioId)
    {
        var filter = Builders<Pago>.Filter.Eq(p => p.UsuarioWebId, usuarioId);
        var sort = Builders<Pago>.Sort.Descending(p => p.FechaPago);
        return await _db.FindToListAsync(_db.Pagos, filter, sort);
    }

    public async Task<Pago?> ObtenerPorIdAsync(string pagoId)
    {
        return await _db.FindFirstOrDefaultAsync(_db.Pagos, p => p.Id == pagoId);
    }

    public async Task<bool> CancelarAsync(string usuarioId)
    {
        var filter = Builders<Pago>.Filter.And(
            Builders<Pago>.Filter.Eq(p => p.UsuarioWebId, usuarioId),
            Builders<Pago>.Filter.Eq(p => p.Estado, "completado"));
        var sort = Builders<Pago>.Sort.Descending(p => p.FechaPago);
        var pago = await _db.FindFirstOrDefaultAsync(_db.Pagos, filter, sort);

        if (pago == null) return false;

        var update = Builders<Pago>.Update.Set(p => p.Estado, "cancelado");
        var result = await _db.Pagos.UpdateOneAsync(p => p.Id == pago.Id, update);
        return result.ModifiedCount > 0;
    }
}
