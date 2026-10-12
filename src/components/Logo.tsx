import focoraIcon from "@/assets/focora-icon.png.asset.json";

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <img src={focoraIcon.url} alt="" className="size-8 object-contain" />
      <span className="font-display text-lg font-semibold">focora</span>
    </span>
  );
}
