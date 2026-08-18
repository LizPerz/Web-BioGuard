## Descripción

<!--- ¿Qué hace este cambio? ¿Por qué es necesario? -->

## Tipo de cambio

- [ ] Corrección de bug
- [ ] Nueva funcionalidad
- [ ] Refactor / calidad de código
- [ ] Seguridad / DevSecOps
- [ ] Documentación
- [ ] Dependencias

## Checklist de seguridad

- [ ] No se agregan secretos, tokens ni credenciales (revisa `gitleaks`).
- [ ] No se introducen APIs peligrosas (`eval`, `innerHTML`, `dangerouslySetInnerHTML`, `new Function`).
- [ ] No se exponen datos personales (PII) en logs, URLs o respuestas.
- [ ] Los imports de `.ts`/`.tsx` usan extensión explícita cuando aplica.
- [ ] El código nuevo cumple la política CSP (`script-src 'self'`).

## Verificación

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`

## Capturas / evidencia (opcional)

<!--- Adjunta capturas si el cambio afecta la UI. -->
