declare global {
  interface Window {
    Omise?: {
      setPublicKey: (key: string) => void;
    createToken: (
      type: "card",
      payload: OmiseCardTokenInput,
      callback: (statusCode: number, response: any) => void
    ) => void;
  };
  }
}

const OMISE_SCRIPT_ID = "omise-js-sdk";
const OMISE_SCRIPT_SRC = "https://cdn.omise.co/omise.js";

export function loadOmiseJs(): Promise<NonNullable<Window["Omise"]>> {
  if (window.Omise) {
    return Promise.resolve(window.Omise);
  }

  const existing = document.getElementById(OMISE_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => {
        if (window.Omise) {
          resolve(window.Omise);
        } else {
          reject(new Error("Omise SDK loaded without global object."));
        }
      });
      existing.addEventListener("error", () => reject(new Error("Unable to load Omise SDK.")));
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = OMISE_SCRIPT_ID;
    script.src = OMISE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      if (window.Omise) {
        resolve(window.Omise);
      } else {
        reject(new Error("Omise SDK loaded without global object."));
      }
    };
    script.onerror = () => reject(new Error("Unable to load Omise SDK."));
    document.body.appendChild(script);
  });
}

export interface OmiseCardTokenInput {
  name: string;
  number: string;
  expiration_month: string;
  expiration_year: string;
  security_code: string;
}

export async function createOmiseCardToken(
  publicKey: string,
  payload: OmiseCardTokenInput
): Promise<string> {
  const omise = await loadOmiseJs();
  omise.setPublicKey(publicKey);

  return new Promise((resolve, reject) => {
    omise.createToken("card", payload, (statusCode, response) => {
      if (statusCode >= 200 && statusCode < 300 && response?.id) {
        resolve(response.id);
        return;
      }

      const message =
        response?.message ||
        response?.object ||
        "Unable to tokenize the card. Please check your details and try again.";
      reject(new Error(message));
    });
  });
}
