
'use server';

import { db } from '@/lib/firebase-admin';
import { doc, getDoc, setDoc } from 'firebase-admin/firestore';
import type {
  GenerateRegistrationOptionsOpts,
  GenerateAuthenticationOptionsOpts,
  VerifyRegistrationResponseOpts,
  VerifyAuthenticationResponseOpts,
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorDevice,
} from '@simplewebauthn/types';

const rpName = 'لوحة تحكم أحمد الحربي';
// This logic ensures rpID and origin are correctly set for Vercel, Firebase Hosting, and local dev.
const rpID = (() => {
    if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' && process.env.NEXT_PUBLIC_VERCEL_URL) {
        // Production on Vercel
        return process.env.NEXT_PUBLIC_VERCEL_URL;
    }
    if (process.env.GCLOUD_PROJECT) {
        // Production on Firebase App Hosting
        return `${process.env.GCLOUD_PROJECT}.web.app`;
    }
    // Local development
    return 'localhost';
})();

const origin = (() => {
    if (rpID === 'localhost') {
        return `http://${rpID}:3000`;
    }
    return `https://${rpID}`;
})();


// Hardcoded user for this single-user dashboard
const user = {
    id: 'admin-user',
    username: 'admin@example.com',
    devices: [] as AuthenticatorDevice[],
    currentChallenge: undefined as string | undefined,
};

async function loadUserFromFirestore() {
    const userRef = doc(db, 'webauthn_users', user.id);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const data = userSnap.data();
        user.devices = data.devices || [];
    }
}

async function saveUserToFirestore() {
    const userRef = doc(db, 'webauthn_users', user.id);
    await setDoc(userRef, { devices: user.devices });
}

export async function getRegistrationOptions() {
    await loadUserFromFirestore();
    
    const opts: GenerateRegistrationOptionsOpts = {
        rpName,
        rpID,
        userID: user.id,
        userName: user.username,
        // Don't recommend any specific authenticators
        attestationType: 'none',
        // Prevent users from re-registering existing authenticators
        excludeCredentials: user.devices.map(dev => ({
            id: dev.credentialID,
            type: 'public-key',
            transports: dev.transports,
        })),
        authenticatorSelection: {
            residentKey: 'required',
            userVerification: 'preferred',
        },
    };

    const options = await generateRegistrationOptions(opts);
    user.currentChallenge = options.challenge;
    return options;
}

export async function verifyRegistration(response: RegistrationResponseJSON) {
    await loadUserFromFirestore();
    const opts: VerifyRegistrationResponseOpts = {
        response,
        expectedChallenge: user.currentChallenge || '',
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
    };
    const verification: VerifiedRegistrationResponse = await verifyRegistrationResponse(opts);
    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
        const { credentialPublicKey, credentialID, counter } = registrationInfo;
        const newDevice: AuthenticatorDevice = {
            credentialPublicKey,
            credentialID,
            counter,
            transports: response.response.transports || [],
        };
        user.devices.push(newDevice);
        await saveUserToFirestore();
    }
    
    user.currentChallenge = undefined;
    return { verified };
}

export async function getAuthenticationOptions() {
    await loadUserFromFirestore();
    const opts: GenerateAuthenticationOptionsOpts = {
        allowCredentials: user.devices.map(dev => ({
            id: dev.credentialID,
            type: 'public-key',
            transports: dev.transports,
        })),
        userVerification: 'preferred',
    };
    const options = await generateAuthenticationOptions(opts);
    user.currentChallenge = options.challenge;
    return options;
}

export async function verifyAuthentication(response: AuthenticationResponseJSON): Promise<{ verified: boolean }> {
    await loadUserFromFirestore();
    
    const authenticator = user.devices.find(
      (dev) => dev.credentialID.toString() === response.id
    );

    if (!authenticator) {
        throw new Error(`Could not find authenticator with ID ${response.id}`);
    }

    const opts: VerifyAuthenticationResponseOpts = {
        response,
        expectedChallenge: user.currentChallenge || '',
        expectedOrigin: origin,
        expectedRPID: rpID,
        authenticator,
        requireUserVerification: true,
    };
    
    const verification: VerifiedAuthenticationResponse = await verifyAuthenticationResponse(opts);
    const { verified, authenticationInfo } = verification;
    
    if (verified) {
        // Update the authenticator's counter in the DB
        authenticator.counter = authenticationInfo.newCounter;
        await saveUserToFirestore();
    }
    
    user.currentChallenge = undefined;
    return { verified };
}
