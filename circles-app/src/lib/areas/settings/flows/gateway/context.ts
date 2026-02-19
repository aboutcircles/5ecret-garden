export type CreateGatewayFlowContext = {
  factoryAddress: string;
  gatewayName: string;
  metadataDigest: string;
  profile: {
    name: string;
    description?: string;
    imageUrl?: string;
    previewImageUrl?: string;
  };
};
