'use client';

import { Amplify } from 'aws-amplify';
import { amplifyConfig } from '@/lib/amplify-config';
import { useEffect } from 'react';

export default function ConfigureAmplifyClient() {
    useEffect(() => {
        Amplify.configure(amplifyConfig, { ssr: true });
    }, []);

    return null;
}