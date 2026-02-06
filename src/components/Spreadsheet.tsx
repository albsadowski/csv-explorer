import jspreadsheet from "jspreadsheet-ce"
import { useEffect, useRef } from "react"

import "../../node_modules/jspreadsheet-ce/dist/jspreadsheet.css"

interface SpreadsheetProps {
	readonly data: any[] | null | undefined
	readonly error: string | null | undefined
}

export default function Spreadsheet(props: SpreadsheetProps) {
	const ref = useRef(null)
	const { data, error } = props

	useEffect(() => {
		if (!data || data.length === 0) {
			return
		}

		const lastResult = data[data.length - 1]
		if (!lastResult || !lastResult.columns || !lastResult.values) {
			return
		}

		const opts = {
			columns: lastResult.columns.map((title: string) => ({
				type: "text",
				title,
				readOnly: true,
				width: 100,
			})),
			data: lastResult.values,
			onbeforepaste: () => false,
			contextMenu: () => false,
		}

		if (ref.current) {
			const el = ref.current as any
			if (el.jexcel) {
				el.jexcel.destroy()
			} else if (el.jspreadsheet) {
				el.jspreadsheet.destroy()
			}

			jspreadsheet(ref.current, opts)
		}
	}, [data])

	if (!data && error) {
		return (
			<div className="p-4 bg-error/10 text-error text-sm font-mono">
				{error}
			</div>
		)
	}

	if (!data || !data.length) {
		return (
			<div className="flex-1 flex items-center justify-center text-base-content/40 text-sm bg-base-100">
				Run a query to see results
			</div>
		)
	}

	return (
		<div
			id="spreadsheet"
			className="bg-base-100 overflow-auto h-full"
			ref={ref}
		/>
	)
}
