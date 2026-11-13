import nodemailer from 'nodemailer';

function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

export async function sendRecoveryCodeEmail({ to, nombre, codigo, expiraMinutos = 10 }) {
  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || `"Artextilo" <${process.env.SMTP_USER || 'no-reply@artextilo.com'}>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Recuperación de Contraseña - Artextilo</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f6f6f6; margin: 0; padding: 20px; color: #222; }
        .container { max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e5e5; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background-color: #111111; padding: 28px 24px; text-align: center; }
        .header h1 { margin: 0; color: #AF9241; font-size: 26px; letter-spacing: 1px; font-weight: 700; }
        .header p { margin: 4px 0 0; color: #d6d6d6; font-size: 13px; }
        .content { padding: 32px 28px; text-align: center; }
        .greeting { font-size: 16px; font-weight: 600; color: #111111; margin-bottom: 8px; text-align: left; }
        .message { font-size: 14px; color: #555555; line-height: 1.5; margin-bottom: 24px; text-align: left; }
        .code-box { background-color: #faf7ee; border: 2px dashed #AF9241; border-radius: 12px; padding: 20px; margin: 24px 0; }
        .code-title { font-size: 12px; font-weight: 700; color: #766E65; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; }
        .code { font-family: 'Courier New', monospace; font-size: 34px; font-weight: 800; color: #111111; letter-spacing: 10px; margin: 0; }
        .warning { font-size: 12px; color: #888888; margin-top: 18px; line-height: 1.4; }
        .footer { background-color: #fafafa; border-top: 1px solid #eeeeee; padding: 18px; text-align: center; font-size: 12px; color: #999999; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ARTEXTILO</h1>
          <p>Sistema de Gestión Administrativa</p>
        </div>
        <div class="content">
          <div class="greeting">Hola, ${nombre}</div>
          <div class="message">
            Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en el sistema de Artextilo. Utiliza el siguiente código de verificación de 6 dígitos para continuar:
          </div>
          
          <div class="code-box">
            <div class="code-title">Tu código de recuperación</div>
            <div class="code">${codigo}</div>
          </div>

          <div class="warning">
            ⏳ Este código expira en <strong>${expiraMinutos} minutos</strong>.<br>
            Si tú no solicitaste este cambio, puedes ignorar este correo de forma segura; tu contraseña actual no será modificada.
          </div>
        </div>
        <div class="footer">
          © ${new Date().getFullYear()} Artextilo · Seguridad de la plataforma
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log('\n======================================================');
    console.log(' [Artextilo] MODO DESARROLLO - ENVÍO DE CORREO');
    console.log(` Para: ${to} (${nombre})`);
    console.log(` Código de recuperación: ${codigo}`);
    console.log(` Válido por: ${expiraMinutos} minutos`);
    console.log(' Nota: Configura SMTP_USER y SMTP_PASS en backend/.env para enviar correos reales por Gmail.');
    console.log('======================================================\n');
    return {
      sent: false,
      devMode: true,
      message: 'Código generado y mostrado en consola (configura SMTP_USER en .env para envío real).',
    };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject: `Código de recuperación: ${codigo} - Artextilo`,
      text: `Hola ${nombre},\n\nTu código de recuperación de contraseña para Artextilo es: ${codigo}\n\nEste código es válido durante ${expiraMinutos} minutos.\nSi no solicitaste este código, haz caso omiso de este mensaje.`,
      html: htmlContent,
    });

    console.log(`[mailer] Correo de recuperación enviado a ${to} (MessageId: ${info.messageId})`);
    return { sent: true, devMode: false, messageId: info.messageId };
  } catch (err) {
    console.error('[mailer] Error al enviar correo por Gmail:', err);
    console.log('\n======================================================');
    console.log(' [Artextilo] RESPALDO EN CONSOLA (Fallo de SMTP)');
    console.log(` Para: ${to} (${nombre})`);
    console.log(` Código de recuperación: ${codigo}`);
    console.log('======================================================\n');
    throw new Error(
      'No se pudo enviar el correo mediante Gmail. Verifica tus credenciales (contraseña de aplicación) en el archivo .env.',
    );
  }
}

