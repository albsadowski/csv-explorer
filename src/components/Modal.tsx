import { ReactNode } from "react"

interface ModalProps {
	readonly children: ReactNode
}

export default function Modal(props: ModalProps) {
	return (
		<div className="modal modal-open">
			<div className="modal-box">{props.children}</div>
			<div className="modal-backdrop bg-black/40"></div>
		</div>
	)
}
