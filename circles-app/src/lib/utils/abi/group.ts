const groupABI = [
  "function owner() external view returns (address)",
  "function service() external view returns (address)",
  "function mintHandler() external view returns (address)",
  "function redemptionHandler() external view returns (address)",
  "function minimalDeposit() external view returns (uint256)",
  "function feeCollection() external view returns (address)",
  "function setService(address _service) external",
  "function setMintHandler(address _mintHandler) external",
  "function setRedemptionHandler(address _redemptionHandler) external",
  "function setMinimalDeposit(uint256 _minimalDeposit) external",
  "function setFeeCollection(address _feeCollection) external",
  "function trust (address[] memory _coreMembers, uint96 _expiry) external",
];

export default groupABI;
