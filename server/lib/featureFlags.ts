export async function getDisabledServices(): Promise<string[]> {
  return [];
}

export async function getDisabledPaymentMethods(): Promise<string[]> {
  return ["kenya", "nigeria", "cameroon", "tanzania", "southAfrica", "ghana", "paypal", "wonyapay", "speedpesa", "fapshi", "other"];
}

export async function isPaymentMethodDisabled(method: string): Promise<boolean> {
  return (await getDisabledPaymentMethods()).includes(method);
}
