// Stripe finto: registra le sessioni create, per i test.
export const sessions = new Map();
let n = 0;
export default class Stripe {
  constructor() {
    this.checkout = { sessions: {
      create: async (p) => { const id = `cs_test_${++n}`; const s = { id, url: `https://checkout.stripe.test/${id}`, status: 'open', payment_status: 'unpaid', metadata: p.metadata, customer_email: p.customer_email, amount_total: p.line_items[0].price_data.unit_amount, _params: p }; sessions.set(id, s); return s; },
      retrieve: async (id) => { if (!sessions.has(id)) throw new Error('no such session'); return sessions.get(id); },
      expire: async (id) => { sessions.get(id).status = 'expired'; return sessions.get(id); },
    } };
    this.webhooks = { constructEventAsync: async (raw, sig) => { if (sig !== 'firma-ok') throw new Error('bad sig'); return JSON.parse(raw); } };
  }
}
