import { MouseEvent, ReactNode, useRef } from "react"

export enum Orientation {
	Horizontal,
	Vertical,
}

interface SplitProps {
	readonly children: ReactNode[]
	readonly orientation?: Orientation
	readonly minSizePx?: number
	readonly gutterSizePx?: number
	readonly initialSplit?: [string, string]
}

function HorizontalSplit(props: SplitProps) {
	const gutter = useRef<HTMLDivElement>(null)
	const leftPane = useRef<HTMLDivElement>(null)
	const rightPane = useRef<HTMLDivElement>(null)

	function gutterOnMouseDown(
		mouseDownEvt: MouseEvent<HTMLDivElement, globalThis.MouseEvent>,
	): void {
		const offsetLeft = gutter.current?.offsetLeft || 0
		const leftWidth = leftPane.current?.offsetWidth || 0
		const rightWidth = rightPane.current?.offsetWidth || 0

		document.onmousemove = (evt: globalThis.MouseEvent) => {
			const dx = Math.min(
				Math.max(evt.clientX - mouseDownEvt.clientX, -leftWidth),
				rightWidth,
			)

			if (gutter.current) {
				gutter.current.style.left = `${offsetLeft + dx}px`
			}
			if (leftPane.current) {
				leftPane.current.style.width = `${leftWidth + dx}px`
			}
			if (rightPane.current) {
				rightPane.current.style.width = `${rightWidth - dx}px`
			}
		}

		document.onmouseup = () => {
			document.onmousemove = document.onmouseup = null
		}
	}

	return (
		<div className="w-full h-full flex flex-row bg-base-100">
			<div
				ref={leftPane}
				className="h-full overflow-auto"
				style={{
					width: props.initialSplit?.[0],
					minWidth: `${props.minSizePx}px`,
				}}
			>
				{props.children[0]}
			</div>
			<div
				ref={gutter}
				className="h-full cursor-col-resize select-none bg-base-300 hover:bg-primary/30 transition-colors"
				style={{ width: `${props.gutterSizePx}px` }}
				onMouseDown={gutterOnMouseDown}
			></div>
			<div
				ref={rightPane}
				className="h-full overflow-auto"
				style={{
					width: props.initialSplit?.[1],
					minWidth: `${props.minSizePx}px`,
				}}
			>
				{props.children[1]}
			</div>
		</div>
	)
}

function VerticalSplit(props: SplitProps) {
	const gutter = useRef<HTMLDivElement>(null)
	const topPane = useRef<HTMLDivElement>(null)
	const bottomPane = useRef<HTMLDivElement>(null)

	function gutterOnMouseDown(
		mouseDownEvt: MouseEvent<HTMLDivElement, globalThis.MouseEvent>,
	) {
		const offsetTop = gutter.current?.offsetTop || 0
		const topHeight = topPane.current?.offsetHeight || 0
		const bottomHeight = bottomPane.current?.offsetHeight || 0

		document.onmousemove = (evt: globalThis.MouseEvent) => {
			const dy = Math.min(
				Math.max(evt.clientY - mouseDownEvt.clientY, -topHeight),
				bottomHeight,
			)

			if (gutter.current) {
				gutter.current.style.top = `${offsetTop + dy}px`
			}
			if (topPane.current) {
				topPane.current.style.height = `${topHeight + dy}px`
			}
			if (bottomPane.current) {
				bottomPane.current.style.height = `${bottomHeight - dy}px`
			}
		}

		document.onmouseup = () => {
			document.onmousemove = document.onmouseup = null
		}
	}

	return (
		<div className="w-full h-full flex flex-col bg-base-100">
			<div
				ref={topPane}
				className="w-full overflow-auto"
				style={{
					height: props.initialSplit?.[0],
					minHeight: `${props.minSizePx}px`,
				}}
			>
				{props.children[0]}
			</div>
			<div
				ref={gutter}
				className="w-full cursor-row-resize select-none bg-base-300 hover:bg-primary/30 transition-colors"
				style={{ height: `${props.gutterSizePx}px` }}
				onMouseDown={gutterOnMouseDown}
			></div>
			<div
				ref={bottomPane}
				className="w-full overflow-auto"
				style={{
					height: props.initialSplit?.[1],
					minHeight: `${props.minSizePx}px`,
				}}
			>
				{props.children[1]}
			</div>
		</div>
	)
}

export default function Split(props: SplitProps) {
	if (props.children.length !== 2) {
		throw new Error("Exactly two childred required for Split")
	}

	const propsWithDefaults = {
		...props,
		orientation: props.orientation || Orientation.Horizontal,
		minSizePx: props.minSizePx || 100,
		gutterSizePx: props.gutterSizePx || 4,
		initialSplit: props.initialSplit || ["20%", "80%"],
	}

	return propsWithDefaults.orientation === Orientation.Horizontal ? (
		<HorizontalSplit {...propsWithDefaults} />
	) : (
		<VerticalSplit {...propsWithDefaults} />
	)
}
