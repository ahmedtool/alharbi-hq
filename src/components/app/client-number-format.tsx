
"use client";

import React, { useState, useEffect } from 'react';
import useClient from '@/hooks/use-client';

interface ClientNumberFormatProps {
    value: number;
}

export function ClientNumberFormat({ value }: ClientNumberFormatProps) {
    const isClient = useClient();

    if (!isClient) {
        // Render a placeholder or nothing on the server and during initial client render.
        // Returning a zero-width space can prevent layout shifts without being visible.
        return <>&#8203;</>;
    }

    return <>{new Intl.NumberFormat('ar-SA').format(value)}</>;
}
