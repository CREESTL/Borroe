# IVesting





Interface of the Vesting contract



## Methods

### claimTokens

```solidity
function claimTokens() external nonpayable
```

Allows a user to claim tokens that were vested by admin for him




### getUserVesting

```solidity
function getUserVesting(address user) external view returns (struct IVesting.TokenVesting)
```

Returns information about the user&#39;s vesting



#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | The address of the user |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | IVesting.TokenVesting | The complete information about specific vesting |

### setToken

```solidity
function setToken(address token) external nonpayable
```

Change BORROE token address



#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | The new address of the BORROE address |

### startInitialVestings

```solidity
function startInitialVestings(address[] initialHolders) external nonpayable
```



*Starts initial vestings for the list of holders.      All BORROE tokens on this contract are vested      Vestings can only happen once*

#### Parameters

| Name | Type | Description |
|---|---|---|
| initialHolders | address[] | The list of holders to receive vested tokens |



## Events

### TokenChanged

```solidity
event TokenChanged(address token)
```

Indicates that address of BORROE token was changed



#### Parameters

| Name | Type | Description |
|---|---|---|
| token  | address | The new address of the BORROE token |

### VestingClaimed

```solidity
event VestingClaimed(address user, uint256 amount)
```

Indicates that user has claimed vested tokens



#### Parameters

| Name | Type | Description |
|---|---|---|
| user  | address | The address of the user |
| amount  | uint256 | The amount of tokens claimed |

### VestingStarted

```solidity
event VestingStarted(address user)
```

Indicates that a new vesting has



#### Parameters

| Name | Type | Description |
|---|---|---|
| user  | address | The address of user |



