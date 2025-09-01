
import BN from 'bn.js'
import Decimal from "decimal.js"

export const dealWithFastRouterSwapParamsForMsafe = (data: any) => {
  const result = {
    ...data,
    amountIn: data?.amountIn?.toString(),
    amountOut: data?.amountIn?.toString(),
    paths: data?.paths?.map((item:any) => {
      const info = {
        ...item,
        amountIn: item?.amountIn?.toString(),
        amountOut: item?.amountOut?.toString(),
      }

      if(item?.initialPrice) {
        info['initialPrice'] = item?.initialPrice?.toString()
      }

      if (item?.extendedDetails?.after_sqrt_price) {
        info['extendedDetails'] = {
          after_sqrt_price: item?.extendedDetails?.afterSqrtPrice?.toString(),
        }
      }
      return info
    })
  }

  return result
}


export const restituteMsafeFastRouterSwapParams = (data: any) => {
  const result = {
    ...data,
    amountIn: new BN(data?.amountIn),
    amountOut: new BN(data?.amountIn),
    paths: data?.paths?.map((item:any) => {
      const info = {
        ...item,
      }

      if (item?.initialPrice) {
        info['initialPrice'] = new Decimal(item?.initialPrice?.toString())
      }

      if (item?.extendedDetails?.after_sqrt_price) {
        info['extendedDetails'] = {
          after_sqrt_price: new Decimal(item?.extendedDetails?.after_sqrt_price?.toString())
        }
      }
      return info
    })
  }

  return result
}
