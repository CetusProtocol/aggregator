
import BN from 'bn.js'
import Decimal from "decimal.js"

export const dealWithFastRouterSwapParamsForMsafe = (data: any) => {
  const result = {
    ...data,
    amountIn: data?.amountIn?.toString(),
    amountOut: data?.amountIn?.toString(),
    routes: data?.routes?.map((item:any) => {
      return {
        ...item,
        amountIn: item?.amountIn?.toString(),
        amountOut: item?.amountOut?.toString(),
        initialPrice: item?.initialPrice?.toString()
      }
    })
  }

  return result
}


export const restituteMsafeFastRouterSwapParams = (data: any) => {
  const result = {
    ...data,
    amountIn: new BN(data?.amountIn),
    amountOut: new BN(data?.amountIn),
    routes: data?.routes?.map((item:any) => {
      return {
        ...item,
        amountIn: new BN(item?.amountIn),
        amountOut: new BN(item?.amountOut),
        initialPrice: new Decimal(item?.initialPrice?.toString())
      }
    })
  }

  return result
}