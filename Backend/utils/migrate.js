import { propertyModel } from "../model/table.js";

// Older properties stored price and area as text, and "area" held the number
// of bedrooms. This converts them once, at startup:
//   price "1,200"  -> 1200
//   area  "3"      -> bedrooms 3 (area is then empty: it now means sq ft)
//   area  "1200"   -> area 1200 sq ft, bedrooms 0
//   no type fields -> propertyType "house", listingType "sale"
// Properties already in the new format are not touched.
const toNumber = (text) => {
  const n = Number(String(text).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export const migrateProperties = async () => {
  const collection = propertyModel.collection;
  const oldDocs = await collection
    .find({
      $or: [
        { price: { $type: "string" } },
        { bedrooms: { $exists: false } },
        { propertyType: { $exists: false } },
        { listingType: { $exists: false } },
      ],
    })
    .toArray();

  for (const doc of oldDocs) {
    const set = {};
    const unset = {};
    if (typeof doc.price === "string") set.price = toNumber(doc.price);
    if (doc.bedrooms === undefined) {
      const oldArea = Math.trunc(toNumber(String(doc.area ?? "").match(/\d+/)?.[0] ?? 0));
      // The old form was labelled "Area" but shown as bedrooms, so either may
      // have been typed. A big number is a size in sq ft, not bedrooms.
      if (oldArea > 20) {
        set.bedrooms = 0;
        set.area = oldArea;
      } else {
        set.bedrooms = oldArea;
        unset.area = "";
      }
    }
    if (!doc.propertyType) set.propertyType = "house";
    if (!doc.listingType) set.listingType = "sale";

    const update = { $set: set };
    if (Object.keys(unset).length) update.$unset = unset;
    await collection.updateOne({ _id: doc._id }, update);
  }

  if (oldDocs.length) {
    console.log(`Converted ${oldDocs.length} properties to the new format.`);
  }
};
