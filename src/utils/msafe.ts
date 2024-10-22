
import BN from 'bn.js'
import Decimal from "decimal.js"

export const dealWithFastRouterSwapParamsForMsafe = (data: any) => {
    const result =data.map((route: any) => {
      return {
        ...route,
        amountIn: route.amountIn.toString(),
        amountOut: route.amountOut.toString(),
        initialPrice: route.initialPrice.toString(),
        path: route.path
      }
    })
    
    return result
  }

  export const restituteMsafeFastRouterSwapParams = (data: any) => {
    const result =data.map((route: any) => {
      return {
        ...route,
        amountIn: new BN(route.amountIn),
        amountOut: new BN(route.amountOut),
        initialPrice: new Decimal(route.initialPrice.toString()),
        path: route.path
      }
    })
    
    return result
  }