import { useEffect, useState } from "react";
import DuckDBClient from "./DuckDBClient";

export default function DuckDBClientWrapper () {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, [])


  if (!isClient) {
    return <div className="p-8 text-center">Loading...</div>
  }

  return <DuckDBClient />
}
