'use client';

import React, { useState } from 'react';
import { MobiGlasPanel, MobiGlasButton } from '@/components/ui/mobiglas';
import { MobiGlasInput, MobiGlasTextArea } from '@/components/ui/mobiglas/MobiGlasInput';

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface FieldErrors {
  [key: string]: string;
}

export default function ContactForm() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage('');
    setErrorMessage('');
    setFieldErrors({});

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(data.message || 'Message transmitted successfully!');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        // Handle validation errors
        if (data.details && Array.isArray(data.details)) {
          const errors: FieldErrors = {};
          data.details.forEach((err: { field: string; message: string }) => {
            errors[err.field] = err.message;
          });
          setFieldErrors(errors);
          setErrorMessage('Please correct the errors below.');
        } else {
          setErrorMessage(data.error || 'Failed to send message. Please try again.');
        }
      }
    } catch (error) {
      setErrorMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MobiGlasPanel
      title="MESSAGE TRANSMISSION"
      variant="dark"
      withScanline
      cornerAccents
      padding="lg"
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
    >
      {successMessage && (
        <div className="mb-6 p-4 bg-[rgba(var(--mg-success),0.1)] border border-[rgba(var(--mg-success),0.3)] rounded-sm" role="alert" aria-live="polite">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-[rgba(var(--mg-success),0.8)] mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-[rgba(var(--mg-success),0.9)]">{successMessage}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 bg-[rgba(var(--mg-error),0.1)] border border-[rgba(var(--mg-error),0.3)] rounded-sm" role="alert" aria-live="polite">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-[rgba(var(--mg-error),0.8)] mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-[rgba(var(--mg-error),0.9)]">{errorMessage}</p>
          </div>
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit}>
          <MobiGlasInput
            label="NAME"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            error={fieldErrors.name}
            disabled={isLoading}
          />

          <MobiGlasInput
            label="COMM RELAY ID"
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            error={fieldErrors.email}
            disabled={isLoading}
          />

          <MobiGlasInput
            label="SUBJECT"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            required
            error={fieldErrors.subject}
            disabled={isLoading}
          />

          <MobiGlasTextArea
            label="MESSAGE CONTENTS"
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows={4}
            required
            error={fieldErrors.message}
            disabled={isLoading}
          />

          <MobiGlasButton
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            withScanline
            isLoading={isLoading}
            rightIcon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            }
          >
            TRANSMIT MESSAGE
          </MobiGlasButton>
        </form>

        <div className="absolute bottom-2 right-2 text-[rgba(var(--mg-text),0.4)] text-xs">
          TRANSMISSION PROTOCOL v3.82
        </div>
    </MobiGlasPanel>
  );
}