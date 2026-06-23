import { RemunerationParams } from "./types";
import { DEFAULT_REMUNERATION_PARAMS } from "./remuneration-calc";
import { getEmployeeParamsMap, saveEmployeeParamsMap } from "./storage";

export function getEmployeeParams(userId: string): RemunerationParams {
  const map = getEmployeeParamsMap();
  return map[userId] ? { ...map[userId] } : { ...DEFAULT_REMUNERATION_PARAMS };
}

export function saveEmployeeParams(userId: string, params: RemunerationParams) {
  const map = getEmployeeParamsMap();
  map[userId] = params;
  saveEmployeeParamsMap(map);
}
