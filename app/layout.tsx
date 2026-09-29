import "./globals.css";
import { PetalBackground } from "@/components/PetalBackground";
export const metadata={title:"Kelvia & Erick — RSVP",description:"Confirmação de presença do casamento de Kelvia & Erick."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body><PetalBackground />{children}<footer className="site-footer">Desenvolvido por <a href="https://github.com/ErickTCosta" target="_blank" rel="noreferrer">Erick Costa</a></footer></body></html>}
