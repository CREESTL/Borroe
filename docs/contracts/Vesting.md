# Vesting



> The contract for BORROE tokens vesting





## Methods

### borroe

```solidity
function borroe() external view returns (address)
```

The BORROE token address




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### claimTokens

```solidity
function claimTokens() external nonpayable
```

See {IVesting-claimVesting}




### getUserVesting

```solidity
function getUserVesting(address user) external view returns (struct IVesting.TokenVesting)
```

See {IVesting-getUserVesting}



#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | IVesting.TokenVesting | undefined |

### owner

```solidity
function owner() external view returns (address)
```



*Returns the address of the current owner.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### renounceOwnership

```solidity
function renounceOwnership() external nonpayable
```



*Leaves the contract without owner. It will not be possible to call `onlyOwner` functions. Can only be called by the current owner. NOTE: Renouncing ownership will leave the contract without an owner, thereby disabling any functionality that is only available to the owner.*


### setToken

```solidity
function setToken(address token) external nonpayable
```

See {IVesting-setToken}



#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | undefined |

### startInitialVestings

```solidity
function startInitialVestings(address[] initialHolders) external nonpayable
```

See {IVesting-startInitialVestings}



#### Parameters

| Name | Type | Description |
|---|---|---|
| initialHolders | address[] | undefined |

### transferOwnership

```solidity
function transferOwnership(address newOwner) external nonpayable
```



*Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| newOwner | address | undefined |

### vested

```solidity
function vested() external view returns (bool)
```

True if initial vestings have started         Vestings can only start once




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |



## Events

### OwnershipTransferred

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| previousOwner `indexed` | address | undefined |
| newOwner `indexed` | address | undefined |

### TokenChanged

```solidity
event TokenChanged(address token)
```

Indicates that address of BORROE token was changed



#### Parameters

| Name | Type | Description |
|---|---|---|
| token  | address | undefined |

### VestingClaimed

```solidity
event VestingClaimed(address user, uint256 amount)
```

Indicates that user has claimed vested tokens



#### Parameters

| Name | Type | Description |
|---|---|---|
| user  | address | undefined |
| amount  | uint256 | undefined |

### VestingStarted

```solidity
event VestingStarted(address user)
```

Indicates that a new vesting has



#### Parameters

| Name | Type | Description |
|---|---|---|
| user  | address | undefined |



