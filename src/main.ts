import "./styles/tailwind.css";
import "./styles/theme.css";
import { bootstrap } from "./ui/bootstrap";

if (new URLSearchParams(window.location.search).get("prototype") === "memory") {
  void import("./ui/memory-prototype").then(({ mountMemoryPrototype }) =>
    mountMemoryPrototype(),
  );
} else bootstrap();
