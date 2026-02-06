import { createRoot } from "react-dom/client"

import App from "./App"
import SqlStore from "./stores/SqlStore"

const container = document.getElementById("app")
const root = createRoot(container!)
const sqlStore = new SqlStore(`workers/database.js?t=${Date.now()}`)

root.render(<App sqlStore={sqlStore} />)
