import { db } from './db.js';

export async function generateAItinerary({
  destination,
  startDate,
  durationDays = 5,
  paxCount = 2,
  budget = 50000,
  currency = 'INR',
  travelStyle = 'Comfort / Family',
  interests = 'Sightseeing, Culture, Heritage, Food',
  hotelCategory = '4-Star',
  specialRequests = ''
}) {
  const settings = (await db.prepare('SELECT * FROM company_settings WHERE id = 1').get()) || {};
  const apiKey = process.env.GEMINI_API_KEY || settings.ai_api_key || '';

  // Calculate duration nights
  const durationNights = Math.max(1, durationDays - 1);

  // If live Gemini API key is provided, try calling Google Gemini API
  if (apiKey) {
    try {
      const prompt = `You are an expert travel itinerary designer for a boutique Indian travel agency.
Design a comprehensive, realistic ${durationDays}-day (${durationNights}-night) travel itinerary for:
- Destination: ${destination}
- Start Date: ${startDate}
- Travelers: ${paxCount}
- Total Budget: ${currency} ${budget}
- Travel Style: ${travelStyle}
- Traveler Interests: ${interests}
- Hotel Category: ${hotelCategory}
- Special Requests: ${specialRequests}

Return ONLY valid JSON matching this exact structure:
{
  "packageName": "Catchy Package Title",
  "destination": "${destination}",
  "durationDays": ${durationDays},
  "durationNights": ${durationNights},
  "summary": "2-3 sentence overview of the trip experience",
  "estimatedSellingPrice": number,
  "estimatedSupplierCost": number,
  "hotelRecommendation": "Recommended hotel or resort name",
  "inclusions": ["Inclusion 1", "Inclusion 2", "Inclusion 3", "Inclusion 4"],
  "exclusions": ["Exclusion 1", "Exclusion 2", "Exclusion 3"],
  "days": [
    {
      "day": 1,
      "title": "Day 1 Theme/Title",
      "morningActivity": "Morning activity details with locations & timing",
      "afternoonActivity": "Afternoon activity details with visit duration",
      "eveningActivity": "Evening experience & dinner suggestion",
      "stayHotel": "Suggested Hotel Name (${hotelCategory})",
      "mealsIncluded": "Breakfast, Dinner",
      "travelTime": "Approx 1-2 hours transfer",
      "estimatedDayCost": 8000
    }
  ]
}`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          parsed.aiSource = 'Live Gemini 1.5 Flash';
          parsed.isEstimateNotice = 'NOTE: All prices, timings, and hotel options are unverified AI estimates. Verify with live suppliers before booking.';
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Gemini API call failed or timed out, falling back to smart rule engine:', err.message);
    }
  }

  // Intelligent generative rule engine for instant offline response
  return generateRuleBasedItinerary({
    destination,
    startDate,
    durationDays,
    durationNights,
    paxCount,
    budget,
    currency,
    travelStyle,
    interests,
    hotelCategory,
    specialRequests
  });
}

function generateRuleBasedItinerary({
  destination,
  startDate,
  durationDays,
  durationNights,
  paxCount,
  budget,
  currency,
  travelStyle,
  interests,
  hotelCategory,
  specialRequests
}) {
  const destLower = (destination || '').toLowerCase();
  let baseHotel = 'Lemon Tree Premier / Fortune Select';
  let avgHotelNight = 5500;

  if (hotelCategory.includes('5') || hotelCategory.toLowerCase().includes('luxury')) {
    avgHotelNight = 14000;
    baseHotel = 'Taj / Oberoi / The Leela Luxury Collection';
  } else if (hotelCategory.includes('3') || hotelCategory.toLowerCase().includes('budget')) {
    avgHotelNight = 3200;
    baseHotel = 'Treebo / Ginger / Standard 3-Star Comfort Hotel';
  }

  const days = [];
  const startObj = startDate ? new Date(startDate) : new Date();

  // Known city activity banks
  const destinationHighlights = getDestinationHighlights(destination);

  for (let i = 1; i <= durationDays; i++) {
    const curDate = new Date(startObj);
    curDate.setDate(curDate.getDate() + (i - 1));
    const dateStr = curDate.toISOString().split('T')[0];

    if (i === 1) {
      days.push({
        day: 1,
        date: dateStr,
        title: `Arrival in ${destination} & Leisure Exploration`,
        morningActivity: `Airport / Station pickup in private air-conditioned vehicle. Welcome greet and assistance.`,
        afternoonActivity: `Check-in at ${baseHotel}. Freshen up and enjoy relaxing traditional welcome refreshments.`,
        eveningActivity: destinationHighlights.arrivalEvening || `Orientation walk through the vibrant local market, followed by authentic regional dinner.`,
        stayHotel: baseHotel,
        mealsIncluded: 'Dinner',
        travelTime: '1 - 2 hours (Airport transfer & local)',
        estimatedDayCost: Math.round(avgHotelNight + 2500)
      });
    } else if (i === durationDays) {
      days.push({
        day: durationDays,
        date: dateStr,
        title: `Farewell ${destination} & Safe Journey Home`,
        morningActivity: `Leisurely breakfast with scenic views. Pack bags and complete checkout formalities.`,
        afternoonActivity: `Last-minute souvenir and local specialty shopping (spices, handicrafts, textiles).`,
        eveningActivity: `Timely drop-off at Airport / Railway Station 3 hours prior to departure. Return with cherishable memories!`,
        stayHotel: 'None (Departure Day)',
        mealsIncluded: 'Breakfast',
        travelTime: '1.5 - 2 hours to airport',
        estimatedDayCost: Math.round(2000)
      });
    } else {
      const highlight = destinationHighlights.days[i - 2] || {
        title: `Scenic Wonders & Culture of ${destination} (Part ${i - 1})`,
        morning: `Post breakfast, depart for guided sightseeing tour covering major cultural landmarks.`,
        afternoon: `Visit premier scenic viewpoints, regional heritage exhibits, and enjoy a curated lunch.`,
        evening: `Leisurely sunset viewpoint, cultural show or riverfront/market stroll.`,
        meals: 'Breakfast, Dinner'
      };

      days.push({
        day: i,
        date: dateStr,
        title: highlight.title,
        morningActivity: highlight.morning,
        afternoonActivity: highlight.afternoon,
        eveningActivity: highlight.evening,
        stayHotel: baseHotel,
        mealsIncluded: highlight.meals || 'Breakfast, Dinner',
        travelTime: highlight.travelTime || '2 - 3 hours scenic transfer',
        estimatedDayCost: Math.round(avgHotelNight + 3500)
      });
    }
  }

  const totalEstCost = days.reduce((sum, d) => sum + (d.estimatedDayCost || 0), 0);
  const totalSelling = Math.round(Math.max(budget, totalEstCost * 1.35) / 100) * 100;

  return {
    packageName: `${destination} ${travelStyle} Odyssey (${durationDays}D / ${durationNights}N)`,
    destination,
    durationDays,
    durationNights,
    summary: `A tailor-made ${durationDays}-day holiday to ${destination} designed for ${travelStyle.toLowerCase()} travelers, focusing on ${interests}. Includes private transfers, premium ${hotelCategory} stays, and authentic local experiences.`,
    estimatedSellingPrice: totalSelling,
    estimatedSupplierCost: Math.round(totalSelling * 0.76),
    hotelRecommendation: baseHotel,
    aiSource: 'Intelligent Travel Engine (Rule-based Generative)',
    isEstimateNotice: 'UNVERIFIED ESTIMATES: Estimated room rates, fuel costs, and entry tickets must be reconfirmed with live suppliers before finalizing quote.',
    inclusions: [
      `${durationNights} Nights accommodation in handpicked ${hotelCategory} hotels`,
      `Daily buffet breakfast & select dinners as specified`,
      `Exclusive chauffeur-driven AC vehicle for entire tour itinerary & sightseeing`,
      `Airport / railway station pickups and drop-offs`,
      `All applicable highway tolls, state permits, parking & driver night charges`,
      `24x7 phone assistance from dedicated holiday specialist`
    ],
    exclusions: [
      `Airfare / Train tickets unless explicitly requested`,
      `Monument entry fees, camera charges & activity tickets (Rafting, Cable car, Safari)`,
      `Personal expenses, laundry, telephone calls, room service & tips`,
      `GST 5% as per Indian Government regulations`
    ],
    cancellationTerms: [
      `30+ days before travel: 10% administrative fee`,
      `15-29 days before travel: 25% of package cost`,
      `7-14 days before travel: 50% of package cost`,
      `Within 7 days of arrival: 100% retention`
    ],
    days
  };
}

function getDestinationHighlights(dest) {
  const d = (dest || '').toLowerCase();

  if (d.includes('kashmir') || d.includes('srinagar')) {
    return {
      arrivalEvening: '1-Hour peaceful sunset Shikara ride across floating vegetable gardens on Dal Lake.',
      days: [
        {
          title: 'Gulmarg Meadow of Flowers & World-Famous Gondola',
          morning: 'Drive to Gulmarg (54km / 2 hrs). Ascend via Gulmarg Gondola Cable Car to Phase 1 Kongdoori.',
          afternoon: 'Ascend to Phase 2 (Apharwat Peak 13,780 ft) for breathtaking snow views and photography.',
          evening: 'Warm Kashmiri Rogan Josh or vegetarian Kashmiri Dum Aloo dinner by the fireplace.',
          meals: 'Breakfast, Dinner',
          travelTime: '2 hrs each way'
        },
        {
          title: 'Pahalgam Valley of Shepherds & Lidder River',
          morning: 'Drive to picturesque Pahalgam via Pampore saffron fields and apple orchards.',
          afternoon: 'Explore Betaab Valley, Chandanwari, and Aru Valley in local union cab.',
          evening: 'Relax by the rushing Lidder river waters or stroll in the vibrant Pahalgam market.',
          meals: 'Breakfast, Dinner',
          travelTime: '2.5 hrs scenic drive'
        },
        {
          title: 'Sonamarg Golden Meadow & Thajiwas Glacier',
          morning: 'Drive through Sindh River valley towards Sonamarg.',
          afternoon: 'Trek or pony ride up to Thajiwas Glacier for year-round snow landscapes.',
          evening: 'Return to Srinagar. Visit royal Mughal Gardens (Nishat & Shalimar Bagh).',
          meals: 'Breakfast, Dinner',
          travelTime: '2.5 hrs drive'
        }
      ]
    };
  }

  if (d.includes('kerala') || d.includes('munnar')) {
    return {
      arrivalEvening: 'Sunset beach walk at Fort Kochi and live performance of classical Kathakali dance.',
      days: [
        {
          title: 'Munnar Emerald Tea Estates & Waterfalls',
          morning: 'Scenic winding drive through Western Ghats, stopping at Cheeyappara and Valara waterfalls.',
          afternoon: 'Visit Tata Tea Museum, Mattupetty Dam, and shout across Echo Point.',
          evening: 'Cardamom and spice infused evening tea, followed by traditional Kerala dinner.',
          meals: 'Breakfast, Dinner',
          travelTime: '3.5 hrs drive'
        },
        {
          title: 'Thekkady Periyar Wildlife Sanctuary & Spice Trails',
          morning: 'Drive to Thekkady. Guided walk through aromatic spice plantations (cardamom, pepper, cinnamon).',
          afternoon: 'Boat cruise on Periyar Lake to spot wild elephants, bison, and exotic birds.',
          evening: 'Watch adrenaline-pumping Kalaripayattu martial arts show at Kadathanadan Kalari Centre.',
          meals: 'Breakfast, Dinner',
          travelTime: '3 hrs drive'
        },
        {
          title: 'Alleppey Backwaters & Deluxe Houseboat Cruise',
          morning: 'Drive down to Alleppey jetty and board your private luxury houseboat.',
          afternoon: 'Glide silently through narrow palm-fringed canals, observing traditional village life.',
          evening: 'Freshly prepared Karimeen Pollichathu dinner under starlit backwater skies.',
          meals: 'Breakfast, Lunch, Dinner',
          travelTime: '3.5 hrs transfer'
        }
      ]
    };
  }

  if (d.includes('rajasthan') || d.includes('jaipur') || d.includes('udaipur')) {
    return {
      arrivalEvening: 'Explore Johari Bazaar for colorful handicrafts, followed by rooftop dinner with fort view.',
      days: [
        {
          title: 'Amber Fort & Pink City Architectural Wonders',
          morning: 'Ascend to Amber Fort with private guide; admire the Sheesh Mahal (Mirror Palace).',
          afternoon: 'Photo stop at Jal Mahal, visit the Maharaja’s City Palace and Jantar Mantar observatory.',
          evening: 'View the iconic honeycomb facade of Hawa Mahal at twilight.',
          meals: 'Breakfast, Dinner',
          travelTime: 'Local Jaipur transit'
        },
        {
          title: 'Agra City of the Taj Mahal',
          morning: 'Drive to Agra via ghost capital Fatehpur Sikri and the grand Buland Darwaza.',
          afternoon: 'Explore the monumental red sandstone Agra Fort, seat of the Mughal Empire.',
          evening: 'Sunset witness of the Taj Mahal glowing pink and gold over the Yamuna River.',
          meals: 'Breakfast, Dinner',
          travelTime: '4 hrs drive via expressway'
        },
        {
          title: 'Udaipur City of Lakes & Palaces',
          morning: 'Fly or drive to Udaipur. Marvel at the grand City Palace complex overlooking Lake Pichola.',
          afternoon: 'Visit Saheliyon-ki-Bari gardens and the Jagdish Temple.',
          evening: 'Private boat cruise on Lake Pichola past Jag Mandir and Taj Lake Palace.',
          meals: 'Breakfast, Dinner',
          travelTime: '1 hr flight / 5 hrs drive'
        }
      ]
    };
  }

  if (d.includes('goa')) {
    return {
      arrivalEvening: 'Candolim / Calangute beach sunset walk, live acoustic guitar music at beach shack.',
      days: [
        {
          title: 'North Goa Forts, Beaches & Water Adventures',
          morning: 'Visit historic Portuguese Aguada Fort and lighthouse with panoramic Arabian Sea views.',
          afternoon: 'Adrenaline watersports at Baga Beach (Parasailing, Jet Ski, Banana ride).',
          evening: 'Explore vibrant Curlies or Tito’s lane, or browse Tibetan market stalls.',
          meals: 'Breakfast',
          travelTime: 'Local North Goa car transit'
        },
        {
          title: 'Old Goa Latin Quarter & UNESCO Churches',
          morning: 'Visit Basilica of Bom Jesus (relics of St. Francis Xavier) and Se Cathedral.',
          afternoon: 'Heritage walking tour in Fontainhas (Latin Quarter) admiring pastel Portuguese villas.',
          evening: '1-Hour Mandovi River sunset cruise with Goan folk dances and DJ music.',
          meals: 'Breakfast, Dinner',
          travelTime: '45 mins drive'
        },
        {
          title: 'South Goa Pristine Shores & Spice Plantation',
          morning: 'Drive south to tranquil Palolem or Colva beach.',
          afternoon: 'Sahakari Spice Farm tour with traditional Goan buffet lunch on banana leaf.',
          evening: 'Sunset cocktail at Cabo de Rama fort cliff viewpoint.',
          meals: 'Breakfast, Lunch',
          travelTime: '1.5 hrs drive'
        }
      ]
    };
  }

  if (d.includes('dubai')) {
    return {
      arrivalEvening: 'Evening stroll at Dubai Marina or viewing the Dubai Fountain show outside Dubai Mall.',
      days: [
        {
          title: 'Modern Dubai Icons & Burj Khalifa Top View',
          morning: 'Guided city drive covering Dubai Frame, Palm Jumeirah and Atlantis photo stop.',
          afternoon: 'Visit Dubai Mall, underwater aquarium tunnel, and ascend to Burj Khalifa 124th floor.',
          evening: 'Gourmet dinner at Dubai Marina promenade.',
          meals: 'Breakfast, Dinner',
          travelTime: 'Local AC transfer'
        },
        {
          title: 'Thrilling Red Dunes Desert Safari with BBQ Dinner',
          morning: 'Morning at leisure for gold souk and spice souk shopping via traditional Abra water taxi.',
          afternoon: '4x4 Land Cruiser dune bashing in Lahbab Desert, sandboarding, and camel ride.',
          evening: 'Bedouin campsite dinner with live Tanoura show, Fire dancer, and belly dance.',
          meals: 'Breakfast, Dinner',
          travelTime: '45 mins each way'
        },
        {
          title: 'Abu Dhabi Day Tour: Sheikh Zayed Mosque & Louvre',
          morning: 'Highway transfer to Abu Dhabi. Visit the breathtaking white marble Sheikh Zayed Grand Mosque.',
          afternoon: 'Drive along the Corniche, visit Emirates Palace and Louvre Abu Dhabi museum.',
          evening: 'Return to Dubai with stop at Ferrari World photo point.',
          meals: 'Breakfast, Dinner',
          travelTime: '1.5 hrs each way'
        }
      ]
    };
  }

  // Default international or national tour
  return {
    arrivalEvening: `Welcome dinner featuring authentic local delicacies and orientation briefing with your guide.`,
    days: [
      {
        title: `Iconic Highlights & City Landmarks of ${dest}`,
        morning: `Private guided exploration of top historic architecture and landmark monuments.`,
        afternoon: `Scenic lunch followed by popular museums, art galleries and botanical parks.`,
        evening: `Panoramic viewpoint for sunset photography and evening leisure.`,
        meals: 'Breakfast, Dinner',
        travelTime: '2 hrs local travel'
      },
      {
        title: `Nature & Adventure Discovery in ${dest}`,
        morning: `Morning excursion to surrounding valley, lakes, or national park reserves.`,
        afternoon: `Outdoor activities (nature trail, boating, or cable car ride).`,
        evening: `Traditional cultural performance and dinner at renowned heritage restaurant.`,
        meals: 'Breakfast, Dinner',
        travelTime: '2.5 hrs transit'
      },
      {
        title: `Hidden Gems & Local Living in ${dest}`,
        morning: `Visit off-the-beaten-path artisan villages, local craft workshops and historical shrines.`,
        afternoon: `Curated food tasting walk through famous culinary bazaars.`,
        evening: `Relaxing sunset river or lakeside cruise.`,
        meals: 'Breakfast, Dinner',
        travelTime: '2 hrs local travel'
      }
    ]
  };
}
