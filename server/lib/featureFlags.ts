export async function getDisabledPaymentMethods():Promise<string[]>{return ["kenya","nigeria","cameroon","tanzania","southAfrica","ghana","paypal","card","other"]}
export async function isPaymentMethodDisabled(method:string){return (await getDisabledPaymentMethods()).includes(method)}
