import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"

describe("router module", () => {
  const keystoreSecret = [
    "0xd36441c734b1967dd4e65956d0b3e7e5dccc8c92306ad71419e6741b4a7ce6c9",
  ]

  test("Parse public key", () => {
    for (const secret of keystoreSecret) {
      const byte = Buffer.from(secret, "base64")
      const u8Array = new Uint8Array(byte)
      const keypair = Ed25519Keypair.fromSecretKey(u8Array.slice(1, 33))
      console.log(
        "\nsecret:",
        secret,
        "\nkeypair public key: ",
        keypair.toSuiAddress()
      )
    }
  })
})
