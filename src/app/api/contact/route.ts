import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS = 3;
const rateLimitMap = new Map<string, { count: number; startTime: number }>();

setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of rateLimitMap.entries()) {
        if (now - record.startTime > RATE_LIMIT_WINDOW) {
            rateLimitMap.delete(ip);
        }
    }
}, RATE_LIMIT_WINDOW);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
    try {
        const ip =
            req.headers.get("x-forwarded-for") ||
            req.headers.get("x-real-ip") ||
            "anonymous";

        const now = Date.now();
        if (!rateLimitMap.has(ip)) {
            rateLimitMap.set(ip, { count: 1, startTime: now });
        } else {
            const record = rateLimitMap.get(ip)!;
            if (now - record.startTime < RATE_LIMIT_WINDOW) {
                if (record.count >= MAX_REQUESTS) {
                    return NextResponse.json(
                        { error: "Too many requests. Please try again later." },
                        { status: 429 }
                    );
                }
                record.count += 1;
            } else {
                rateLimitMap.set(ip, { count: 1, startTime: now });
            }
        }

        const body = await req.json();
        const { name, email, message } = body || {};

        if (!name || !email || !message) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        if (!emailRegex.test(String(email))) {
            return NextResponse.json(
                { error: "Invalid email address" },
                { status: 400 }
            );
        }

        if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
            return NextResponse.json(
                { error: "Email service not configured" },
                { status: 500 }
            );
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD,
            },
        });

        await transporter.sendMail({
            from: `"EZConfig Contact" <${process.env.SMTP_EMAIL}>`,
            to: "asksenpai.dev@gmail.com",
            subject: `New Contact Message from ${name}`,
            replyTo: email,
            html: `
                <h2>New Contact Message</h2>
                <p><b>Name:</b> ${name}</p>
                <p><b>Email:</b> ${email}</p>
                <p><b>Message:</b></p>
                <p>${message}</p>
            `,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Email send error:", error);
        return NextResponse.json(
            { error: "Failed to send message" },
            { status: 500 }
        );
    }
}
