import type { CirclesConfig } from "@circles-sdk/sdk";
import { gnosisConfig } from "$lib/circlesConfig";

export let circlesConfig: { config: CirclesConfig } = $state({ config: gnosisConfig.production });