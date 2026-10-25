import {
  dedupeVehiclesBySourceKey,
  parseInventoryPage,
  parseManufacturerLinks,
  parseNextPage,
} from "../functions/_shared/vehicle-catalog.ts";

Deno.test("only queues manufacturer inventory with a positive result count", () => {
  const html = `
    <a href="https://hiluxperu.com/stocklist/1/maker/toyota">Toyota (191)</a>
    <a href="https://hiluxperu.com/stocklist/2/maker/brand-without-stock">Brand (0)</a>
    <a href="https://example.com/stocklist/2/maker/other">Other (10)</a>`;
  const links = parseManufacturerLinks(html);
  if (links.length !== 1 || !links[0].includes("/maker/toyota")) {
    throw new Error(`Unexpected manufacturer list: ${links.join(", ")}`);
  }
});

Deno.test("deduplicates inventory overlaps by supplier reference", () => {
  const html = `<!--single product--><div class="dev-h-stocklist-row">
    <a href="https://hiluxperu.com/detail/toyota/abc-123"><div class="dev-h-model-title"><h3>2026 Toyota Corolla Cross</h3></div></a>
    <div class="dev-h-ref-no">Ref No. ABC-123</div></div><!--single product--><nav></nav>`;
  const [vehicle] = parseInventoryPage(html, "https://hiluxperu.com/stocklist/1/maker/toyota");
  if (!vehicle) throw new Error("Expected a parsed vehicle");
  const deduped = dedupeVehiclesBySourceKey([vehicle, { ...vehicle }]);
  if (deduped.length !== 1) throw new Error(`Expected one unique vehicle, got ${deduped.length}`);
});

Deno.test("parses vehicle identity, referential price label and source URL", () => {
  const html = `<!--single product-->
    <div class="dev-h-stocklist-row">
      <a href="https://hiluxperu.com/detail/toyota/abc-123">
        <div class="dev-h-model-title"><h3>2026 Toyota Corolla Cross Hybrid</h3></div>
      </a>
      <div class="dev-h-total-price-wrapper">
        <div class="dev-h-price-title">Ex Showroom Price:</div>
        <div class="dev-h-price-value">$24,900</div>
      </div>
      <div class="dev-h-ref-no">Ref No. ABC-123</div>
      <div class="dev-h-mob-fuel">Fuel: <span>Hybrid</span></div>
      <div class="dev-h-mob-trans">Trans: <span>CVT</span></div>
      <div class="dev-h-mob-engine">Engine: <span>1.8L</span></div>
      <img class="dev-h-wrapper-img" src="/images/corolla.jpg" />
    </div>
    <!--single product--><nav class="pagination"></nav>`;
  const [vehicle] = parseInventoryPage(
    html,
    "https://hiluxperu.com/stocklist/1/maker/toyota",
  );
  if (!vehicle) throw new Error("Expected a parsed vehicle");
  if (vehicle.brand !== "Toyota" || vehicle.year !== 2026) {
    throw new Error(`Unexpected identity: ${vehicle.brand}, ${vehicle.year}`);
  }
  if (vehicle.price !== 24900 || vehicle.price_label !== "Ex Showroom Price") {
    throw new Error(`Incorrect extracted price: ${JSON.stringify(vehicle)}`);
  }
  if (vehicle.currency !== "USD" || vehicle.fuel !== "Hybrid") {
    throw new Error("Expected the source currency and fuel to be retained");
  }
  if (vehicle.source_url !== "https://hiluxperu.com/detail/toyota/abc-123") {
    throw new Error(`Unexpected source URL: ${vehicle.source_url}`);
  }
});

Deno.test("parses the current Hilux page markup without legacy product comments", () => {
  const html = `
    <div class="dev-h-stocklist-row">
      <div class="dev-h-stocklist-col-m-1">
        <div class="dev-h-wrapper-img">
          <a href="https://hiluxperu.com/detail/TOYOTA/SUV-4WD-AT-2024-K-0609">
            <img src="https://hiluxperu.com/assets/product_photos/K-0609/car.jpg" />
          </a>
          <a class="dev-h-ref-no" href="https://hiluxperu.com/detail/TOYOTA/SUV-4WD-AT-2024-K-0609">Ref No. K-0609</a>
        </div>
      </div>
      <div class="dev-h-stocklist-col-m-2">
        <div class="dev-h-model-title"><a href="https://hiluxperu.com/detail/TOYOTA/SUV-4WD-AT-2024-K-0609">
          <h3>2024 TOYOTA LAND CRUISER SUV 4.5 4WD AT White</h3>
        </a></div>
        <p class="dev-h-price-title">Ex Showroom Price</p>
        <p class="dev-h-price-value">$134900</p>
        <div class="dev-h-mob-location">Trans: <span>Automatic</span></div>
        <div class="dev-h-mob-location">Fuel: <span>Diesel</span></div>
      </div>
    </div>
    <nav class="pagination"></nav>`;

  const [vehicle] = parseInventoryPage(
    html,
    "https://hiluxperu.com/stocklist/1/maker/toyota",
  );
  if (!vehicle) throw new Error("Expected a vehicle from the current page layout");
  if (vehicle.brand !== "TOYOTA" || vehicle.model !== "LAND CRUISER SUV 4.5 4WD AT White") {
    throw new Error(`Unexpected scraped vehicle: ${JSON.stringify(vehicle)}`);
  }
  if (vehicle.price !== 134900 || vehicle.fuel !== "Diesel" || vehicle.transmission !== "Automatic") {
    throw new Error(`Unexpected scraped attributes: ${JSON.stringify(vehicle)}`);
  }
  if (vehicle.source_reference !== "K-0609") {
    throw new Error(`Unexpected source reference: ${vehicle.source_reference}`);
  }
});

Deno.test("accepts only same-site inventory pagination links", () => {
  const next = parseNextPage('<a href="/stocklist/1/maker/toyota?page=2" rel="next">Next</a>');
  if (next !== "https://hiluxperu.com/stocklist/1/maker/toyota?page=2") {
    throw new Error(`Unexpected next URL: ${next}`);
  }
  if (parseNextPage('<a href="https://example.com/steal" rel="next">Next</a>')) {
    throw new Error("External pagination URL should be rejected");
  }
});
