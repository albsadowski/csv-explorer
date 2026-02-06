export type ButtonVariant =
	| "ghost"
	| "primary"
	| "secondary"
	| "error"
	| "outline"

interface ActionButtonProps {
	readonly id: string
	readonly label: string
	readonly action: () => any
	readonly disabled?: boolean
	readonly variant?: ButtonVariant
}

const variantClass: Record<ButtonVariant, string> = {
	ghost: "btn-ghost",
	primary: "btn-primary",
	secondary: "btn-secondary",
	error: "btn-error",
	outline: "btn-outline",
}

export default function ActionButton(props: ActionButtonProps) {
	const { disabled, id, label, action, variant = "ghost" } = props

	return (
		<button
			id={id}
			disabled={typeof disabled === "boolean" ? disabled : false}
			className={`btn btn-sm ${variantClass[variant]}`}
			onClick={action}
		>
			{label}
		</button>
	)
}
