import { GET as GETBrand } from "./[brand]/route";

export async function GET(request: Request) {
  return GETBrand(request, { params: Promise.resolve({ brand: "default" }) });
}
