import Link from "next/link";
import { CubeIcon } from "@radix-ui/react-icons";
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="AI For Work, trang chủ">
      <span className="brand-icon">
        <CubeIcon />
      </span>
      <span>
        AI <span className="brand-light">for</span> Work
        <span className="brand-period">.</span>
      </span>
    </Link>
  );
}
