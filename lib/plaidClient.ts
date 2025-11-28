import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

/**
 * Returns a configured Plaid API client using environment variables.
 *
 * Required environment variables:
 * - PLAID_CLIENT_ID: Your Plaid client ID
 * - PLAID_SECRET: Your Plaid secret key
 * - PLAID_ENV: The Plaid environment ('sandbox' | 'development' | 'production')
 *
 * Optional environment variables:
 * - PLAID_PRODUCTS: Comma-separated products (default: 'transactions')
 * - PLAID_COUNTRY_CODES: Comma-separated country codes (default: 'US')
 */

/**
 * Get the Plaid secret based on PLAID_ENV.
 * Supports both PLAID_SECRET (single secret) and environment-specific secrets
 * (PLAID_SANDBOX_SECRET, PLAID_PROD_SECRET).
 */
function getPlaidSecret(): string {
  const env = process.env.PLAID_ENV;

  // First try environment-specific secrets
  if (env === 'sandbox' && process.env.PLAID_SANDBOX_SECRET) {
    return process.env.PLAID_SANDBOX_SECRET;
  }
  if (env === 'production' && process.env.PLAID_PROD_SECRET) {
    return process.env.PLAID_PROD_SECRET;
  }
  if (env === 'development' && process.env.PLAID_DEV_SECRET) {
    return process.env.PLAID_DEV_SECRET;
  }

  // Fall back to generic PLAID_SECRET
  if (process.env.PLAID_SECRET) {
    return process.env.PLAID_SECRET;
  }

  throw new Error(
    `Missing Plaid secret for environment "${env}". ` +
    `Please set PLAID_SECRET or PLAID_${env?.toUpperCase()}_SECRET in .env.local`
  );
}

// Validate required environment variables
function validateEnvVars() {
  const required = ['PLAID_CLIENT_ID', 'PLAID_ENV'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Plaid environment variables: ${missing.join(', ')}. ` +
        'Please add them to your .env.local file.'
    );
  }

  const validEnvs = ['sandbox', 'development', 'production'];
  if (!validEnvs.includes(process.env.PLAID_ENV!)) {
    throw new Error(
      `Invalid PLAID_ENV: "${process.env.PLAID_ENV}". Must be one of: ${validEnvs.join(', ')}`
    );
  }

  // Validate that we have a secret for this environment
  getPlaidSecret();
}

/**
 * Get the Plaid environment URL based on PLAID_ENV
 */
function getPlaidEnvironment(): string {
  const env = process.env.PLAID_ENV as 'sandbox' | 'development' | 'production';
  const envMap: Record<string, string> = {
    sandbox: PlaidEnvironments.sandbox,
    development: PlaidEnvironments.development,
    production: PlaidEnvironments.production,
  };
  return envMap[env];
}

/**
 * Parse PLAID_PRODUCTS env var into Products array
 * Defaults to ['transactions'] if not specified
 */
export function getPlaidProducts(): Products[] {
  const productsStr = process.env.PLAID_PRODUCTS || 'transactions';
  const productMap: Record<string, Products> = {
    transactions: Products.Transactions,
    auth: Products.Auth,
    identity: Products.Identity,
    assets: Products.Assets,
    investments: Products.Investments,
    liabilities: Products.Liabilities,
    payment_initiation: Products.PaymentInitiation,
    standing_orders: Products.StandingOrders,
    transfer: Products.Transfer,
    employment: Products.Employment,
    income: Products.Income,
    income_verification: Products.IncomeVerification,
    signal: Products.Signal,
    statements: Products.Statements,
  };

  return productsStr.split(',').map((p) => {
    const product = productMap[p.trim().toLowerCase()];
    if (!product) {
      throw new Error(`Invalid Plaid product: "${p}". Valid products: ${Object.keys(productMap).join(', ')}`);
    }
    return product;
  });
}

/**
 * Parse PLAID_COUNTRY_CODES env var into CountryCode array
 * Defaults to ['US'] if not specified
 */
export function getPlaidCountryCodes(): CountryCode[] {
  const countriesStr = process.env.PLAID_COUNTRY_CODES || 'US';
  const countryMap: Record<string, CountryCode> = {
    US: CountryCode.Us,
    CA: CountryCode.Ca,
    GB: CountryCode.Gb,
    ES: CountryCode.Es,
    FR: CountryCode.Fr,
    IE: CountryCode.Ie,
    NL: CountryCode.Nl,
    DE: CountryCode.De,
    IT: CountryCode.It,
    PL: CountryCode.Pl,
    DK: CountryCode.Dk,
    NO: CountryCode.No,
    SE: CountryCode.Se,
    EE: CountryCode.Ee,
    LT: CountryCode.Lt,
    LV: CountryCode.Lv,
    PT: CountryCode.Pt,
    BE: CountryCode.Be,
  };

  return countriesStr.split(',').map((c) => {
    const country = countryMap[c.trim().toUpperCase()];
    if (!country) {
      throw new Error(`Invalid country code: "${c}". Valid codes: ${Object.keys(countryMap).join(', ')}`);
    }
    return country;
  });
}

// Singleton Plaid client instance
let plaidClient: PlaidApi | null = null;

/**
 * Returns a configured Plaid API client.
 * Uses a singleton pattern to avoid creating multiple clients.
 */
export function getPlaidClient(): PlaidApi {
  if (plaidClient) {
    return plaidClient;
  }

  validateEnvVars();

  const configuration = new Configuration({
    basePath: getPlaidEnvironment(),
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
        'PLAID-SECRET': getPlaidSecret(),
      },
    },
  });

  plaidClient = new PlaidApi(configuration);
  return plaidClient;
}
