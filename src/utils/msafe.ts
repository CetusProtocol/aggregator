import BN from "bn.js"
import Decimal from "decimal.js"

const dealWithMsafePackages = (packages: any) => {
  if (!packages) {
    return packages
  }

  if (packages instanceof Map) {
    return Object.fromEntries(packages)
  }

  if (Array.isArray(packages)) {
    return Object.fromEntries(packages)
  }

  return packages
}

const restituteMsafePackages = (packages: any) => {
  if (!packages) {
    return packages
  }

  if (packages instanceof Map) {
    return packages
  }

  if (Array.isArray(packages)) {
    return new Map(
      packages.map(([key, value]) => [key, value?.toString?.() ?? value])
    )
  }

  if (typeof packages === "object") {
    return new Map(
      Object.entries(packages).map(([key, value]) => [
        key,
        value?.toString?.() ?? value,
      ])
    )
  }

  return packages
}

const dealWithMsafeExtendedDetails = (extendedDetails: any) => {
  if (!extendedDetails) {
    return extendedDetails
  }

  const result = {
    ...extendedDetails,
  }
  const afterSqrtPrice =
    extendedDetails.after_sqrt_price ?? extendedDetails.afterSqrtPrice

  if (afterSqrtPrice != null) {
    result.after_sqrt_price = afterSqrtPrice.toString()
  }

  return result
}

const restituteMsafeExtendedDetails = (extendedDetails: any) => {
  if (!extendedDetails) {
    return extendedDetails
  }

  const result = {
    ...extendedDetails,
  }
  const afterSqrtPrice =
    extendedDetails.after_sqrt_price ?? extendedDetails.afterSqrtPrice

  if (afterSqrtPrice != null) {
    result.after_sqrt_price = new Decimal(afterSqrtPrice.toString())
  }

  return result
}

export const dealWithFastRouterSwapParamsForMsafe = (data: any) => {
  const result = {
    ...data,
    amountIn: data?.amountIn?.toString(),
    amountOut: data?.amountOut?.toString(),
    packages: dealWithMsafePackages(data?.packages),
    paths: data?.paths?.map((item: any) => {
      const info = {
        ...item,
        amountIn: item?.amountIn?.toString(),
        amountOut: item?.amountOut?.toString(),
        extendedDetails: dealWithMsafeExtendedDetails(item?.extendedDetails),
      }

      if (item?.initialPrice) {
        info["initialPrice"] = item?.initialPrice?.toString()
      }

      return info
    }),
  }

  return result
}

export const restituteMsafeFastRouterSwapParams = (data: any) => {
  const result = {
    ...data,
    amountIn: new BN(data?.amountIn),
    amountOut: new BN(data?.amountOut),
    packages: restituteMsafePackages(data?.packages),
    paths: data?.paths?.map((item: any) => {
      const info = {
        ...item,
        extendedDetails: restituteMsafeExtendedDetails(item?.extendedDetails),
      }

      if (item?.initialPrice) {
        info["initialPrice"] = new Decimal(item?.initialPrice?.toString())
      }
      return info
    }),
  }

  return result
}
