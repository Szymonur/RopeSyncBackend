import nodemailer from "nodemailer";

console.log("Initializing SMTP transporter with host:", process.env.SMTP_HOST);

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT === "465", // true dla 465, false dla 587
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
});

export const sendEmail = async (options: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
}) => {
    const mailOptions = {
        from: '"RopeSync" <no-reply@szymonurban.com>',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent: %s", info.messageId);
        return info;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
};

export const sendResetPasswordEmail = async (
    email: string,
    resetToken: string,
) => {
    const resetUrl = `${process.env.FRONTEND_URL}/choose-new-password?token=${resetToken}`;
    // const resetUrl = `ropesync://choose-new-password?token=${resetToken}`;

    return sendEmail({
        to: email,
        subject: "Reset hasła w RopeSync",
        text: `Otrzymaliśmy prośbę o zresetowanie hasła. Kliknij w poniższy link, aby ustawić nowe hasło: ${resetUrl}`,
        html: `<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
                <h2>Resetowanie hasła</h2>
                <p>Otrzymałeś tę wiadomość, ponieważ poprosiłeś o zresetowanie hasła w aplikacji RopeSync.</p>
                <p>Kliknij w poniższy przycisk, aby ustawić nowe hasło:</p>
                <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Zresetuj hasło</a>
                <p style="margin-top: 20px; font-size: 0.8em; color: #666;">Jeśli to nie Ty prosiłeś o reset, zignoruj tę wiadomość.</p>
               </div>`,
    });
};
