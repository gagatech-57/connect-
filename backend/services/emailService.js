import transporter from '../config/nodemailer.js';

export const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: `"Gaga Connect" <${process.env.EMAIL_USER || 'noreply@gagaconnect.com'}>`,
    to: email,
    subject: 'Verify Your Email - Gaga Connect OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #6366f1; text-align: center;">Welcome to Gaga Connect!</h2>
        <p>Hello,</p>
        <p>Thank you for registering. Please use the following One-Time Password (OTP) to verify your email address. This OTP is valid for <strong>5 minutes</strong> and can only be used once.</p>
        <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #1f2937; border-radius: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="color: #4b5563; font-size: 14px;">If you didn't request this code, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">&copy; ${new Date().getFullYear()} Gaga Connect. All rights reserved.</p>
      </div>
    `,
  };

  // If credentials are not set, output to console for easy testing/mocking
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || process.env.EMAIL_USER.includes('your_gmail')) {
    console.log(`\n======================================================`);
    console.log(`[DEV MODE] SMTP credentials not set. OTP for ${email}: ${otp}`);
    console.log(`======================================================\n`);
    return { mock: true, otp };
  }

  return await transporter.sendMail(mailOptions);
};
