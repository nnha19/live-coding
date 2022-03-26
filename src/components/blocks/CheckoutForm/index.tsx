import React, {
    FC,
    useCallback,
    useEffect,
    SyntheticEvent,
    ChangeEvent,
    useState,
} from "react"
import useModels from "@packages/react-use-models"
import useValidator from "@packages/react-joi"
import Joi from "joi"
import {
    formatCardNumber,
    formatCardExpiry,
    validateCardExpiry,
    validateCardCVC,
} from "creditcardutils"
import { FaCcMastercard } from "react-icons/fa"
import { RiVisaLine } from "react-icons/ri"

// Styled Elements
import {
    Actions,
    Container,
    Fields,
    ErrorMessage,
    FieldControl,
    FieldLabel,
    Input,
    Form,
    FieldGroups,
    FieldsMerge,
    PayBtn,
    CardsContainer,
} from "./index.styled"
import toast from "react-hot-toast"

const validateVisaCard = (value: string) =>
    /^4[0-9]{12}(?:[0-9]{3})?$/.test(value)

const validateMasterCard = (value: string) => /^5[1-5][0-9]{14}$/.test(value)

type TypeCheckoutFormDefaultValues = {
    email: string | null
    card_number: string | null
    card_expire: string | null
    cvv: string | null
}

export type TypeCheckoutFormValues = NonNullable<TypeCheckoutFormDefaultValues>

export interface CheckoutFormProps {
    onSuccess: (values: TypeCheckoutFormValues) => void
    loading?: boolean
    submitText?: string
}

const defaultState: TypeCheckoutFormDefaultValues = {
    email: null,
    card_number: null,
    card_expire: null,
    cvv: null,
}

const CheckoutForm: FC<CheckoutFormProps> = ({
    onSuccess,
    loading = false,
    submitText = "Submit",
}) => {
    const { models, register, updateModel } =
        useModels<TypeCheckoutFormDefaultValues>({
            defaultState,
        })
    const [cardType, setCardType] = useState<null | "visa" | "master">(null)

    const { state, setData } = useValidator({
        initialData: defaultState,
        schema: Joi.object({
            email: Joi.string()
                .email({
                    tlds: { allow: false },
                })
                .required()
                .messages({
                    "string.empty": "Required",
                    "string.email": "Must be a valid email",
                    "any.required": "Required",
                }),
            card_number: Joi.string()
                .custom((value, helpers) => {
                    if (value) {
                        // Only accept visa or master cards
                        const trimmed = value.replaceAll(" ", "")
                        if (
                            validateMasterCard(trimmed) ||
                            validateVisaCard(trimmed)
                        ) {
                            return
                        }
                        return helpers.error("string.cardNumber")
                    }

                    return value
                })
                .required()
                .messages({
                    "string.empty": "Required",
                    "string.cardNumber": "Must be visa or master card type",
                    "any.required": "Required",
                }),
            card_expire: Joi.string()
                .custom((value, helpers) => {
                    if (value) {
                        // Validate expiry date of the card
                        let [month, year] = value.replaceAll(" ", "").split("/")
                        const isValid = validateCardExpiry(month, year)
                        if (!isValid) {
                            return helpers.error("string.expiryDate")
                        }
                    }
                })
                .required()
                .messages({
                    "string.empty": "Required",
                    "any.required": "Required",
                    "string.expiryDate": "Invalid expiry date",
                }),
            cvv: Joi.string()
                .length(3)
                .custom((value, helpers) => {
                    if (value) {
                        return !validateCardCVC(value)
                            ? helpers.error("string.invalidCVV")
                            : null
                    }
                })
                .required()
                .messages({
                    "string.empty": "Required",
                    "string.length": "Maximum 3 digits",
                    "any.required": "Required",
                    "string.invalidCVV": "Invalid CVV/CVC",
                }),
        }),
    })

    const getErrors = useCallback(
        (field) => {
            return state.$errors[field]
                .map((data: any) => data.$message)
                .join(",")
        },
        [state.$errors]
    )

    const onSubmit = (e: SyntheticEvent) => {
        e.preventDefault()
        if (state.$auto_invalid) {
            const invalidFields = []
            for (let key in state.$errors) {
                if (!!state.$errors[key].length) {
                    invalidFields.push(true)
                }
            }
            toast.error(
                `Invalid input field${invalidFields.length > 1 ? "s" : ""}`
            )
            return
        }
        onSuccess(state.$data)
    }
    const formatter = {
        cardNumber: (e: ChangeEvent<HTMLInputElement>) => {
            const value = formatCardNumber(e.target.value)

            updateModel("card_number", value)
        },
        cardExpire: (e: ChangeEvent<HTMLInputElement>) => {
            const value = formatCardExpiry(e.target.value)
            updateModel("card_expire", value)
        },
    }

    // Sync model <-> validator
    useEffect(() => {
        setData(models)
    }, [models])

    useEffect(() => {
        // Check the type of the card
        let { card_number } = state.$data
        if (!card_number) {
            setCardType(null)
            return
        }
        card_number = card_number.replaceAll(" ", "")
        if (validateVisaCard(card_number)) {
            setCardType("visa")
        } else if (validateMasterCard(card_number)) {
            setCardType("master")
        } else {
            setCardType(null)
        }
    }, [state.$data.card_number])

    return (
        <Container>
            <Form onSubmit={onSubmit}>
                <Fields>
                    <FieldControl>
                        <FieldLabel error={!!getErrors("email")}>
                            Email
                        </FieldLabel>
                        <Input
                            {...register.input({ name: "email" })}
                            type="email"
                            placeholder="you@company.com"
                            autoComplete="current-email"
                        />
                    </FieldControl>
                    {getErrors("email") && (
                        <ErrorMessage>{getErrors("email")}</ErrorMessage>
                    )}
                </Fields>
                <FieldGroups>
                    <Fields>
                        <FieldControl>
                            <FieldLabel error={!!getErrors("card_number")}>
                                Card information
                            </FieldLabel>
                            <Input
                                {...register.input({
                                    name: "card_number",
                                    onChange: formatter.cardNumber,
                                })}
                                type="text"
                                placeholder="1234 1234 1234 1234"
                            />
                            <CardsContainer>
                                {!cardType ? (
                                    <>
                                        <RiVisaLine className="visa" />
                                        <FaCcMastercard className="master" />
                                    </>
                                ) : cardType === "visa" ? (
                                    <RiVisaLine className="visa" />
                                ) : (
                                    <FaCcMastercard className="master" />
                                )}
                            </CardsContainer>
                        </FieldControl>
                        {getErrors("card_number") && (
                            <ErrorMessage>
                                {getErrors("card_number")}
                            </ErrorMessage>
                        )}
                    </Fields>
                    <FieldsMerge>
                        <Fields>
                            <Input
                                {...register.input({
                                    name: "card_expire",
                                    onChange: formatter.cardExpire,
                                })}
                                type="text"
                                placeholder="MM / YY"
                            />

                            {getErrors("card_expire") && (
                                <ErrorMessage>
                                    {getErrors("card_expire")}
                                </ErrorMessage>
                            )}
                        </Fields>
                        <Fields>
                            <Input
                                {...register.input({ name: "cvv" })}
                                type="text"
                                placeholder="123"
                            />

                            {getErrors("cvv") && (
                                <ErrorMessage>{getErrors("cvv")}</ErrorMessage>
                            )}
                        </Fields>
                    </FieldsMerge>
                </FieldGroups>
                <Actions>
                    <PayBtn disabled={state.$auto_invalid || loading}>
                        {submitText}
                    </PayBtn>
                </Actions>
            </Form>
        </Container>
    )
}

export default CheckoutForm
