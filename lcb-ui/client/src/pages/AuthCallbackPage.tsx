/*
 * ADOBE CONFIDENTIAL
 * ___________________
 * Copyright 2025 Adobe
 * All Rights Reserved.
 * NOTICE: All information contained herein is, and remains
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe
 * and its suppliers and are protected by all applicable intellectual
 * property laws, including trade secret and copyright laws.
 *  Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProgressCircle, Text, Heading } from '@react-spectrum/s2';
import { imsService } from '../services/ims';

/**
 * Auth Callback Page
 *
 * Handles OAuth redirect from Adobe IMS after user authentication.
 * This page:
 * 1. Waits for IMS to process the OAuth fragment values
 * 2. Verifies user is authenticated
 * 3. Retrieves stored auth context (return path)
 * 4. Navigates back to the original page with flag to reopen Tool Planner
 *
 * Flow:
 * 1. User clicks "Sign In" in Tool Planner
 * 2. IMS opens OAuth flow (popup or redirect)
 * 3. User authenticates with Adobe
 * 4. IMS redirects to this page with OAuth parameters in URL fragment
 * 5. This page waits for IMS to process and verify authentication
 * 6. Once verified, navigates back to /actions?reopenToolPlanner=true
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const processCallback = async () => {
      try {
        console.log('[AuthCallbackPage] Processing OAuth callback');

        // Load IMS library if not already loaded
        await imsService.loadLibrary();

        // Try to get fragment values from URL
        // IMS Thin library should have parsed the OAuth redirect parameters
        const fragmentValues = imsService.getFragmentValues();
        console.log('[AuthCallbackPage] Fragment values:', fragmentValues);

        // Manually process the fragment token if present
        // The onAccessToken callback doesn't fire after redirect, so we need to extract it manually
        if (!imsService.isAuthenticated() && fragmentValues?.access_token) {
          console.log('[AuthCallbackPage] Processing fragment token manually...');
          const processed = imsService.processFragmentToken();

          if (!processed) {
            throw new Error('Failed to process fragment token');
          }
        }

        // Verify authentication succeeded
        if (!imsService.isAuthenticated()) {
          throw new Error('Authentication failed. No access token found.');
        }

        console.log('[AuthCallbackPage] Authentication successful');
        setStatus('success');

        // Get stored auth context
        const authContext = imsService.getAuthContext();
        const returnPath = authContext?.returnPath || '/actions';

        console.log('[AuthCallbackPage] Redirecting to:', returnPath);

        // Navigate back to original page with flag to reopen Tool Planner
        setTimeout(() => {
          navigate(`${returnPath}?reopenToolPlanner=true`, { replace: true });
        }, 500);
      } catch (error) {
        console.error('[AuthCallbackPage] Error processing callback:', error);
        setStatus('error');
        setErrorMessage(
          error instanceof Error ? error.message : 'Unknown authentication error'
        );

        // Redirect to actions page after 3 seconds
        setTimeout(() => {
          navigate('/actions', { replace: true });
        }, 3000);
      }
    };

    processCallback();
  }, [navigate]);

  return (
    <div style={{ padding: 'var(--spectrum-global-dimension-size-300)', height: '100vh' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: 'var(--spectrum-global-dimension-size-300)'
        }}
      >
        {status === 'processing' && (
          <>
            <ProgressCircle aria-label="Processing authentication" isIndeterminate />
            <Heading level={2}>Processing Authentication</Heading>
            <Text>Please wait while we complete your sign-in...</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="24" cy="24" r="24" fill="#2D9D78" />
              <path
                d="M20 24L22 26L28 20"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <Heading level={2}>Authentication Successful</Heading>
            <Text>Redirecting you back to the application...</Text>
          </>
        )}

        {status === 'error' && (
          <>
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="24" cy="24" r="24" fill="#D7373F" />
              <path
                d="M18 18L30 30M30 18L18 30"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <Heading level={2}>Authentication Failed</Heading>
            <Text>{errorMessage}</Text>
            <Text UNSAFE_style={{ color: '#6E6E6E', fontSize: '14px' }}>
              Redirecting to actions page in 3 seconds...
            </Text>
          </>
        )}
      </div>
    </div>
  );
}
