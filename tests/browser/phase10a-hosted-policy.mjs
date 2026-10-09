export const HOSTED_PRODUCTION_OPT_IN='PHASE10A_ENABLE_HOSTED_PRODUCTION';

export function hostedProductionEnabled(environment={}){
  return environment?.[HOSTED_PRODUCTION_OPT_IN]==='1';
}

export async function runHostedProductionIfEnabled(action,{environment={}}={}){
  if(!hostedProductionEnabled(environment))return {skipped:true,reason:`requires explicit ${HOSTED_PRODUCTION_OPT_IN}=1 opt-in`,productionRequests:0};
  return action();
}
