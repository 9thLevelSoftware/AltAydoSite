import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendContactFormEmail } from '@/lib/email-service';
import { logInfo, logError } from '@/lib/logger';
import { apiRateLimiter } from '@/lib/rate-limiter';

// Validation schema
const contactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(200, 'Subject too long'),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message too long'),
});

// Mask an email address for privacy-safe logging (keep first 2 chars + domain).
const maskEmail = (value: string): string => value.replace(/(?<=.{2}).(?=.*@)/g, '*');

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Validate input
    const result = contactFormSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: result.error.errors.map((err) => ({
            field: err.path[0],
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const { name, email, subject, message } = result.data;

    // Per-IP and per-email throttling to limit abuse of the public form.
    // Reuse the shared apiRateLimiter with namespaced keys so contact-form
    // limits stay isolated from other API consumers.
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const ipKey = `contact:ip:${clientIp}`;
    const emailKey = `contact:email:${email.toLowerCase()}`;
    const ipLimited = apiRateLimiter.isRateLimited(ipKey);
    const emailLimited = apiRateLimiter.isRateLimited(emailKey);

    if (ipLimited || emailLimited) {
      const limitedKey = ipLimited ? ipKey : emailKey;
      logInfo('Contact form rate limited', {
        email: maskEmail(email),
        reason: ipLimited ? 'ip' : 'email',
      });
      return NextResponse.json(
        {
          error: 'Too many requests. Please wait before submitting again.',
          resetTime: apiRateLimiter.getResetTime(limitedKey),
        },
        { status: 429 }
      );
    }

    // Check if email service is configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      logError('Contact form submission failed - email not configured', undefined, {
        name,
        email: maskEmail(email),
      });

      return NextResponse.json(
        { error: 'Email service not configured. Please contact support directly.' },
        { status: 503 }
      );
    }

    // Send email
    const emailSent = await sendContactFormEmail(name, email, subject, message);

    if (!emailSent) {
      logError('Contact form email failed to send', undefined, {
        email: maskEmail(email),
      });
      return NextResponse.json(
        { error: 'Failed to send message. Please try again later.' },
        { status: 500 }
      );
    }

    // Log success
    const duration = Date.now() - startTime;
    logInfo('Contact form submission successful', {
      name,
      email: maskEmail(email),
      subject,
      duration,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Message transmitted successfully. We will respond within 24-48 hours.',
      },
      { status: 200 }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    logError('Contact form API error', error as Error, { duration });

    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
