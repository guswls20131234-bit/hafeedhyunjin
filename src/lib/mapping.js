// formData(앱 상태) <-> DB 컬럼 매핑

export function formToDb(data) {
  return {
    customer_type:    data.b0 || null,
    farm_name:        data.b1 || null,
    owner_name:       data.b2 || null,
    location:         data.b3 || null,
    farm_type:        data.b4 || null,
    farm_scale:       data.b5 || null,
    farm_years:       data.b6 || null,
    contact:          data.b7 || null,

    current_feed:     data.c1 || null,
    monthly_feed_ton: data.c2 || null,
    psy:              data.c3 || null,
    fcr:              data.c4 || null,
    shipping_info:    data.c5 || null,
    shipping_dest:    data.c6 || null,
    annual_head:      data.c7 || null,

    pain_feed:        data.p1 || null,
    pain_productivity: Array.isArray(data.p2) ? data.p2 : [],
    pain_disease:     data.p3 || null,
    pain_labor:       data.p4 || null,
    pain_finance:     data.p5 || null,

    change_intent:    data.n1 || null,
    key_conditions:   Array.isArray(data.n2) ? data.n2 : [],
    payment_terms:    data.n3 || null,
    tech_support:     data.n4 || null,
    sample_test:      data.n5 || null,
    expected_volume:  data.n6 || null,

    decision_maker:   data.d1 || null,
    decision_process: data.d2 || null,
    competitor:       data.d3 || null,
    switch_period:    data.d4 || null,

    meeting_date:     data.m1 || null,
    attendees:        data.m2 || null,
    atmosphere:       data.m3 || null,
    possibility:      data.m4 || null,
    action_plan:      data.m5 || null,
    memo:             data.m6 || null,
  }
}

export function dbToForm(row) {
  return {
    b0: row.customer_type    || '',
    b1: row.farm_name        || '',
    b2: row.owner_name       || '',
    b3: row.location         || '',
    b4: row.farm_type        || '',
    b5: row.farm_scale       || '',
    b6: row.farm_years       || '',
    b7: row.contact          || '',

    c1: row.current_feed     || '',
    c2: row.monthly_feed_ton || '',
    c3: row.psy              || '',
    c4: row.fcr              || '',
    c5: row.shipping_info    || '',
    c6: row.shipping_dest    || '',
    c7: row.annual_head      || '',

    p1: row.pain_feed        || '',
    p2: row.pain_productivity || [],
    p3: row.pain_disease     || '',
    p4: row.pain_labor       || '',
    p5: row.pain_finance     || '',

    n1: row.change_intent    || '',
    n2: row.key_conditions   || [],
    n3: row.payment_terms    || '',
    n4: row.tech_support     || '',
    n5: row.sample_test      || '',
    n6: row.expected_volume  || '',

    d1: row.decision_maker   || '',
    d2: row.decision_process || '',
    d3: row.competitor       || '',
    d4: row.switch_period    || '',

    m1: row.meeting_date     || '',
    m2: row.attendees        || '',
    m3: row.atmosphere       || '',
    m4: row.possibility      || '',
    m5: row.action_plan      || '',
    m6: row.memo             || '',
  }
}
