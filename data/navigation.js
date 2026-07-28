import { HiOutlineSquares2X2, HiOutlineUsers } from "react-icons/hi2";
import { FaShip } from "react-icons/fa6";
import { MdOutlineRoute } from "react-icons/md";
import { FiSettings } from "react-icons/fi";
import { PiSuitcaseSimple } from "react-icons/pi";

export const NAV = [
  { href: "/dashboard", label: "Tableau de bord", icon: HiOutlineSquares2X2 },
  { href: "/clients", label: "Clients", icon: HiOutlineUsers },
  { href: "/bookings", label: "Réservations", icon: FaShip },
  { href: "/forfaits", label: "Calculateur de forfaits", icon: PiSuitcaseSimple },
  { href: "/itineraries", label: "Itinéraires", icon: MdOutlineRoute },
  { href: "/settings", label: "Paramètres", icon: FiSettings },
];
