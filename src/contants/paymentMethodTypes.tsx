type CardMethod = {
  id: string
  object: "card"
  card: {
    brand: string
    last4: string
    exp_month: number
    exp_year: number
  }
  is_default?: boolean
}

type BankMethod = {
  id: string
  object: "bank_account"
  bank_name: string
  last4: string
  available_payout_methods: string[]
  default_for_currency?: boolean
}

 export type PayoutMethod = CardMethod | BankMethod