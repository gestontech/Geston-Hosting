import { Capacitor } from "@capacitor/core";
import { fetchWithAuth } from "./apiClient";

export interface PlayLicenseResult {
  licensed: boolean;
  error?: string;
}

export async function verifyPlayLicense(): Promise<PlayLicenseResult> {
  if (
    Capacitor.getPlatform() !==
    "android"
  ) {
    return {
      licensed: false,
      error:
        "Google Play licence verification is available on Android.",
    };
  }

  try {
    const challengeResponse =
      await fetchWithAuth(
        "/auth/play-license/challenge"
      );

    if (!challengeResponse.ok) {
      const data =
        await challengeResponse
          .json()
          .catch(() => ({}));

      return {
        licensed: false,
        error:
          data?.error ||
          "Unable to create licence challenge.",
      };
    }

    const challenge =
      (await challengeResponse.json()) as {
        nonce: string;
      };

    if (!challenge.nonce) {
      return {
        licensed: false,
        error:
          "Google Play licence challenge is missing.",
      };
    }

    const { PlayIntegrity } =
      await import(
        "@capacitor-community/play-integrity"
      );

    const integrity =
      await PlayIntegrity.requestIntegrityToken(
        {
          nonce: challenge.nonce,
          googleCloudProjectNumber: 0,
        }
      );

    if (!integrity?.token) {
      return {
        licensed: false,
        error:
          "Google Play did not return an integrity token.",
      };
    }

    const verificationResponse =
      await fetchWithAuth(
        "/auth/play-license/verify",
        {
          method: "POST",
          body: JSON.stringify({
            token: integrity.token,
          }),
        }
      );

    const result =
      await verificationResponse
        .json()
        .catch(() => ({}));

    if (
      !verificationResponse.ok ||
      result?.licensed !== true
    ) {
      return {
        licensed: false,
        error:
          result?.error ||
          "This Google Play account is not licensed for Geston Hosting.",
      };
    }

    return {
      licensed: true,
    };
  } catch (error) {
    return {
      licensed: false,
      error:
        error instanceof Error
          ? error.message
          : "Google Play licence verification failed.",
    };
  }
}
