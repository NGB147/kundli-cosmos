/* ============================================================================
   quotes.js - verses from the world's scriptures, for the landing page and
   the farewell. Each verse is rendered in plain modern English from the
   original; sources are given so the reader can find the full passage.
   Themes let the farewell verse be chosen from what the visitor asked.
============================================================================ */
(function (root) {
  'use strict';

  /* t = the verse, s = source, tr = tradition, th = themes */
  var ALL = [
    /* ---- Vedas ---- */
    { t:'Truth is one; the wise call it by many names.', s:'Rig Veda 1.164.46', tr:'Hindu · Rig Veda', th:['wisdom','faith','unity'] },
    { t:'Come together, speak together, let your minds be of one accord.', s:'Rig Veda 10.191.2', tr:'Hindu · Rig Veda', th:['home','love','unity'] },
    { t:'Let noble thoughts come to us from every side.', s:'Rig Veda 1.89.1', tr:'Hindu · Rig Veda', th:['wisdom','study','begin'] },
    { t:'The Earth is my mother, and I am her child.', s:'Atharva Veda 12.1.12', tr:'Hindu · Atharva Veda', th:['home','gratitude','peace','health'] },
    { t:'May there be peace in the sky, peace in the space between, peace on the earth, peace in the waters, peace in the plants and the trees. May that peace come to me.', s:'Yajur Veda 36.17', tr:'Hindu · Yajur Veda', th:['peace','health','home'] },
    { t:'There was neither non-being nor being then; neither the sky nor the space beyond it. What stirred? Where? In whose keeping?', s:'Rig Veda 10.129.1', tr:'Hindu · Rig Veda', th:['wisdom','faith'] },

    /* ---- Upanishads ---- */
    { t:'Lead me from the unreal to the real, from darkness to light, from death to immortality.', s:'Brihadaranyaka Upanishad 1.3.28', tr:'Hindu · Upanishads', th:['faith','wisdom','change'] },
    { t:'You are what your deepest desire is. As your desire is, so is your will; as your will is, so is your deed; as your deed is, so is your destiny.', s:'Brihadaranyaka Upanishad 4.4.5', tr:'Hindu · Upanishads', th:['effort','begin','courage','career'] },
    { t:'Truth alone triumphs, not falsehood.', s:'Mundaka Upanishad 3.1.6', tr:'Hindu · Upanishads', th:['wisdom','courage'] },
    { t:'Arise, awake, and stop not until the goal is reached.', s:'Katha Upanishad 1.3.14', tr:'Hindu · Upanishads', th:['effort','begin','courage','study','career'] },
    { t:'That which is the finest essence — this whole world has that as its soul. That is the truth. That is the self. You are that.', s:'Chandogya Upanishad 6.8.7', tr:'Hindu · Upanishads', th:['wisdom','peace'] },
    { t:'All this, whatever moves in this moving world, is held by the Lord. Enjoy what is given up; do not covet the wealth of anyone.', s:'Isha Upanishad 1', tr:'Hindu · Upanishads', th:['contentment','wealth','gratitude'] },
    { t:'The whole world is one family.', s:'Maha Upanishad 6.71', tr:'Hindu · Upanishads', th:['home','love','travel','unity'] },
    { t:'May all be happy. May all be free from illness. May all see what is good. May no one suffer.', s:'Traditional Sanskrit shanti mantra', tr:'Hindu · Shanti mantra', th:['peace','health','home'] },

    /* ---- Bhagavad Gita and Yoga ---- */
    { t:'You have a right to your work, but never to its fruits. Do not let the fruit be your motive, and do not cling to inaction either.', s:'Bhagavad Gita 2.47', tr:'Hindu · Bhagavad Gita', th:['effort','patience','career'] },
    { t:'Cold and heat, pleasure and pain, come and go; they do not last. Bear them.', s:'Bhagavad Gita 2.14', tr:'Hindu · Bhagavad Gita', th:['patience','loss','health'] },
    { t:'Lift yourself by your own self; do not let yourself sink. You alone are your friend, and you alone are your enemy.', s:'Bhagavad Gita 6.5', tr:'Hindu · Bhagavad Gita', th:['courage','effort','health'] },
    { t:'Whenever the mind wanders, restless and unsteady, bring it back and place it under the rule of the self.', s:'Bhagavad Gita 6.26', tr:'Hindu · Bhagavad Gita', th:['peace','study'] },
    { t:'Better your own path walked imperfectly than another’s walked well.', s:'Bhagavad Gita 3.35', tr:'Hindu · Bhagavad Gita', th:['career','courage','change'] },
    { t:'The self is never born and never dies. It is unborn, eternal, ever-existing; it is not slain when the body is slain.', s:'Bhagavad Gita 2.20', tr:'Hindu · Bhagavad Gita', th:['loss','faith'] },
    { t:'Yoga is the stilling of the movements of the mind.', s:'Yoga Sutras of Patanjali 1.2', tr:'Hindu · Yoga Sutras', th:['peace','health'] },
    { t:'Practice becomes firm when it is done for a long time, without break, and with devotion.', s:'Yoga Sutras of Patanjali 1.14', tr:'Hindu · Yoga Sutras', th:['effort','patience','study'] },
    { t:'If you think you are free, you are free. If you think you are bound, you are bound.', s:'Ashtavakra Gita 1.11', tr:'Hindu · Ashtavakra Gita', th:['courage','peace'] },

    /* ---- Bhakti and Tamil ---- */
    { t:'There is no dharma higher than helping others, and no wrong lower than hurting them.', s:'Tulsidas, Ramcharitmanas, Uttara Kanda', tr:'Hindu · Ramcharitmanas', th:['love','home','career'] },
    { t:'The river that flows in you also flows in me.', s:'Kabir', tr:'Bhakti · Kabir', th:['love','unity'] },
    { t:'What stands will fall. What moves will stay.', s:'Basavanna, vachana', tr:'Lingayat · Basavanna', th:['change','travel','courage'] },
    { t:'Laugh when trouble comes. There is nothing like it for facing trouble down.', s:'Tirukkural 621', tr:'Tamil · Tirukkural', th:['courage','loss'] },
    { t:'To the learned, every country is their own and every town their home.', s:'Tirukkural 397', tr:'Tamil · Tirukkural', th:['travel','study'] },
    { t:'Do not say “this is too hard.” Effort brings the greatness it seeks.', s:'Tirukkural 611', tr:'Tamil · Tirukkural', th:['effort','career'] },
    { t:'Whatever is heard, from whomever it is heard, wisdom is to see its truth.', s:'Tirukkural 423', tr:'Tamil · Tirukkural', th:['wisdom','study'] },

    /* ---- Buddhist ---- */
    { t:'Mind comes first. All things are made of mind, led by mind.', s:'Dhammapada 1', tr:'Buddhist · Dhammapada', th:['peace','wisdom'] },
    { t:'Hatred is never ended by hatred. It is ended by love alone. This is an ancient law.', s:'Dhammapada 5', tr:'Buddhist · Dhammapada', th:['love','home','peace'] },
    { t:'You yourselves must make the effort. The awakened only point the way.', s:'Dhammapada 276', tr:'Buddhist · Dhammapada', th:['effort','study','career'] },
    { t:'Better than a thousand hollow words is one word that brings peace.', s:'Dhammapada 100', tr:'Buddhist · Dhammapada', th:['peace','love'] },
    { t:'Health is the greatest gift, contentment the greatest wealth, a trusted friend the best relation.', s:'Dhammapada 204', tr:'Buddhist · Dhammapada', th:['health','wealth','contentment'] },
    { t:'Drop by drop the water pot is filled. So the wise, gathering little by little, fill themselves with good.', s:'Dhammapada 122', tr:'Buddhist · Dhammapada', th:['patience','effort','wealth'] },
    { t:'Be a lamp unto yourselves. Be your own refuge. Hold fast to the truth as a lamp.', s:'Mahaparinibbana Sutta, Digha Nikaya 16', tr:'Buddhist · Sutta', th:['courage','loss','faith'] },
    { t:'As a mother would guard her only child with her life, so cultivate a boundless heart toward all beings.', s:'Metta Sutta, Sutta Nipata 1.8', tr:'Buddhist · Sutta', th:['love','home'] },
    { t:'To study the way is to study the self. To study the self is to forget the self.', s:'Dogen, Genjokoan', tr:'Zen · Dogen', th:['wisdom','peace','study'] },

    /* ---- Jain ---- */
    { t:'All life is bound together by mutual support.', s:'Tattvartha Sutra 5.21', tr:'Jain · Tattvartha Sutra', th:['home','love','unity'] },
    { t:'Who harms the earth, the water, the fire, the air and the plants harms their own self.', s:'Acharanga Sutra 1.1', tr:'Jain · Acharanga Sutra', th:['health','gratitude'] },
    { t:'Conquer anger with calm, pride with humility, deceit with honesty, greed with contentment.', s:'Dashavaikalika Sutra 8.38', tr:'Jain · Dashavaikalika Sutra', th:['peace','contentment','wealth'] },

    /* ---- Sikh ---- */
    { t:'There is one God. Truth is Its name. The Creator, without fear, without hate, beyond time, unborn, self-existent.', s:'Guru Granth Sahib, Mool Mantar', tr:'Sikh · Guru Granth Sahib', th:['faith'] },
    { t:'Truth is high, but higher still is truthful living.', s:'Guru Nanak, Guru Granth Sahib p. 62', tr:'Sikh · Guru Nanak', th:['wisdom','courage','career'] },
    { t:'Those who have loved are the ones who have found God.', s:'Guru Gobind Singh, Sawaiya', tr:'Sikh · Guru Gobind Singh', th:['love'] },
    { t:'Recognise the whole human race as one.', s:'Guru Gobind Singh, Akal Ustat', tr:'Sikh · Guru Gobind Singh', th:['unity','travel','love'] },
    { t:'Work honestly, share what you earn, and remember the Name.', s:'Guru Nanak, the three pillars', tr:'Sikh · Guru Nanak', th:['career','wealth','gratitude'] },
    { t:'Fear no one, and frighten no one.', s:'Guru Tegh Bahadur, Guru Granth Sahib p. 1427', tr:'Sikh · Guru Tegh Bahadur', th:['courage'] },

    /* ---- Taoist and Confucian ---- */
    { t:'A journey of a thousand miles begins beneath your feet.', s:'Tao Te Ching 64', tr:'Taoist · Tao Te Ching', th:['begin','travel','effort'] },
    { t:'The highest good is like water. It benefits all things and does not compete.', s:'Tao Te Ching 8', tr:'Taoist · Tao Te Ching', th:['peace','love','career'] },
    { t:'Knowing others is intelligence; knowing yourself is wisdom. Mastering others is strength; mastering yourself is power.', s:'Tao Te Ching 33', tr:'Taoist · Tao Te Ching', th:['wisdom','courage'] },
    { t:'Who can wait quietly while the mud settles? Who can stay still until the moment to act?', s:'Tao Te Ching 15', tr:'Taoist · Tao Te Ching', th:['patience','timing'] },
    { t:'A frog in a well cannot speak of the ocean.', s:'Zhuangzi, Autumn Floods', tr:'Taoist · Zhuangzi', th:['travel','study'] },
    { t:'As heaven moves ever onward, so the noble one strengthens themselves without ceasing.', s:'I Ching, hexagram 1', tr:'Chinese · I Ching', th:['effort','courage','career'] },
    { t:'Do not impose on others what you do not wish for yourself.', s:'Analects of Confucius 15.24', tr:'Confucian · Analects', th:['love','home'] },
    { t:'Is it not a joy to learn, and in time to practise what you have learned?', s:'Analects of Confucius 1.1', tr:'Confucian · Analects', th:['study'] },
    { t:'It is like raising a mound: if I stop one basket short, it is I who stopped.', s:'Analects of Confucius 9.19', tr:'Confucian · Analects', th:['effort','patience','career'] },
    { t:'Virtue is never alone. It always has neighbours.', s:'Analects of Confucius 4.25', tr:'Confucian · Analects', th:['love','home'] },

    /* ---- Jewish ---- */
    { t:'To everything there is a season, and a time for every purpose under heaven.', s:'Ecclesiastes 3:1', tr:'Jewish · Tanakh', th:['timing','patience','change'] },
    { t:'Trust in the Lord with all your heart, and do not lean on your own understanding.', s:'Proverbs 3:5', tr:'Jewish · Tanakh', th:['faith'] },
    { t:'A person’s heart plans the way, but the Lord directs the steps.', s:'Proverbs 16:9', tr:'Jewish · Tanakh', th:['timing','faith','travel'] },
    { t:'Weeping may stay for the night, but joy comes in the morning.', s:'Psalm 30:5', tr:'Jewish · Psalms', th:['loss','patience'] },
    { t:'Be still, and know that I am God.', s:'Psalm 46:10', tr:'Jewish · Psalms', th:['peace'] },
    { t:'Choose life, so that you and your children may live.', s:'Deuteronomy 30:19', tr:'Jewish · Torah', th:['health','home','begin'] },
    { t:'Love your neighbour as yourself.', s:'Leviticus 19:18', tr:'Jewish · Torah', th:['love'] },
    { t:'You are not obliged to finish the work, but neither are you free to abandon it.', s:'Pirkei Avot 2:16', tr:'Jewish · Mishnah', th:['effort','patience','career'] },
    { t:'Who is rich? The one who rejoices in their portion.', s:'Pirkei Avot 4:1', tr:'Jewish · Mishnah', th:['wealth','contentment'] },
    { t:'Whoever saves a single life is considered to have saved an entire world.', s:'Mishnah Sanhedrin 4:5', tr:'Jewish · Mishnah', th:['love','health'] },
    { t:'If I am not for myself, who will be for me? If I am only for myself, what am I? And if not now, when?', s:'Pirkei Avot 1:14', tr:'Jewish · Mishnah', th:['begin','timing','courage'] },

    /* ---- Christian ---- */
    { t:'Ask, and it will be given to you. Seek, and you will find. Knock, and the door will be opened.', s:'Matthew 7:7', tr:'Christian · Gospel', th:['begin','effort','faith'] },
    { t:'Do not worry about tomorrow, for tomorrow will worry about itself. Each day has enough trouble of its own.', s:'Matthew 6:34', tr:'Christian · Gospel', th:['peace','patience'] },
    { t:'Those who wait upon the Lord shall renew their strength. They shall rise up on wings like eagles.', s:'Isaiah 40:31', tr:'Christian · Bible', th:['patience','health','faith'] },
    { t:'Love is patient, love is kind. It does not envy, it does not boast, it is not proud.', s:'1 Corinthians 13:4', tr:'Christian · Epistles', th:['love','home'] },
    { t:'Blessed are the peacemakers.', s:'Matthew 5:9', tr:'Christian · Gospel', th:['peace','home'] },
    { t:'Do to others as you would have them do to you.', s:'Luke 6:31', tr:'Christian · Gospel', th:['love'] },
    { t:'Where your treasure is, there your heart will be also.', s:'Matthew 6:21', tr:'Christian · Gospel', th:['wealth'] },
    { t:'Let us not grow weary in doing good, for in due season we shall reap, if we do not lose heart.', s:'Galatians 6:9', tr:'Christian · Epistles', th:['patience','effort','career'] },

    /* ---- Islamic ---- */
    { t:'With hardship comes ease. Truly, with hardship comes ease.', s:'Quran 94:5–6', tr:'Islamic · Quran', th:['loss','patience','courage'] },
    { t:'God does not burden a soul beyond what it can bear.', s:'Quran 2:286', tr:'Islamic · Quran', th:['patience','health','loss'] },
    { t:'God does not change the condition of a people until they change what is in themselves.', s:'Quran 13:11', tr:'Islamic · Quran', th:['effort','change','begin'] },
    { t:'Be patient. God is with those who are patient.', s:'Quran 2:153', tr:'Islamic · Quran', th:['patience'] },
    { t:'Whoever is grateful is grateful for their own good.', s:'Quran 31:12', tr:'Islamic · Quran', th:['gratitude'] },
    { t:'Travel through the earth and see how He began creation.', s:'Quran 29:20', tr:'Islamic · Quran', th:['travel'] },
    { t:'Actions are judged by intentions, and everyone will have what they intended.', s:'Hadith, Sahih al-Bukhari 1', tr:'Islamic · Hadith', th:['begin','effort','career'] },
    { t:'None of you truly believes until you wish for others what you wish for yourself.', s:'Hadith, Sahih al-Bukhari 13', tr:'Islamic · Hadith', th:['love'] },
    { t:'The best of people are those who are most useful to people.', s:'Hadith, al-Mu’jam al-Awsat', tr:'Islamic · Hadith', th:['career','love'] },

    /* ---- Sufi ---- */
    { t:'What you seek is seeking you.', s:'Rumi', tr:'Sufi · Rumi', th:['love','begin'] },
    { t:'Keep your gaze on the bandaged place. That is where the light enters you.', s:'Rumi, Masnavi', tr:'Sufi · Rumi', th:['loss','health','courage'] },
    { t:'Human beings are limbs of one body, made from the same essence.', s:'Saadi, Gulistan', tr:'Sufi · Saadi', th:['love','unity'] },

    /* ---- Zoroastrian ---- */
    { t:'Good thoughts, good words, good deeds.', s:'Avesta — humata, hukhta, huvarshta', tr:'Zoroastrian · Avesta', th:['effort','wisdom'] },
    { t:'Hear with your ears the best things. See with a clear mind. Then let each one choose, for themselves, between the two ways.', s:'Gathas, Yasna 30.2', tr:'Zoroastrian · Gathas', th:['wisdom','timing','courage'] },
    { t:'Happiness comes to those who bring happiness to others.', s:'Gathas, Yasna 43.1', tr:'Zoroastrian · Gathas', th:['love','gratitude'] },

    /* ---- Bahá’í ---- */
    { t:'The earth is but one country, and mankind its citizens.', s:'Bahá’u’lláh, Gleanings', tr:'Bahá’í · Bahá’u’lláh', th:['travel','unity'] },
    { t:'Noble have I created thee, yet thou hast abased thyself. Rise, then, to that for which thou wast created.', s:'Bahá’u’lláh, The Hidden Words', tr:'Bahá’í · Bahá’u’lláh', th:['courage','begin'] },

    /* ---- Japanese ---- */
    { t:'Even the wish of an ant reaches heaven.', s:'Japanese proverb', tr:'Japanese · proverb', th:['faith','effort'] },
    { t:'Fall seven times, rise eight.', s:'Japanese proverb — nana korobi ya oki', tr:'Japanese · proverb', th:['courage','effort','loss'] }
  ];

  /* deterministic hash so "today's verse" is the same for everyone today */
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }

  function daily(date) {
    var d = date || new Date();
    var key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    var idx = hash('verse:' + key) % ALL.length;
    return { idx: idx, q: ALL[idx], key: key };
  }

  function random(exceptIdx) {
    var idx;
    do { idx = Math.floor(Math.random() * ALL.length); } while (ALL.length > 1 && idx === exceptIdx);
    return { idx: idx, q: ALL[idx] };
  }

  /* Which themes an answer calls for, from its life area and verdict. */
  var THEMES = {
    career:    { up:['effort','career','begin'],   down:['patience','career','faith'],  mid:['effort','patience'] },
    money:     { up:['wealth','gratitude'],        down:['contentment','patience'],     mid:['wealth','contentment'] },
    love:      { up:['love'],                      down:['love','patience'],            mid:['love','peace'] },
    education: { up:['study','wisdom'],            down:['study','patience','effort'],  mid:['study'] },
    health:    { up:['health','peace'],            down:['health','patience','loss'],   mid:['health'] },
    travel:    { up:['travel','begin'],            down:['travel','timing','patience'], mid:['travel','change'] },
    family:    { up:['home','love'],               down:['home','peace','patience'],    mid:['home'] },
    timing:    { up:['begin','timing','courage'],  down:['patience','timing'],          mid:['timing'] }
  };
  var DEFAULT_THEMES = ['peace','wisdom','begin'];

  function lean(verdictKey) {
    return (verdictKey === 'strong' || verdictKey === 'favor') ? 'up'
         : (verdictKey === 'caution' || verdictKey === 'hard') ? 'down' : 'mid';
  }

  /* answers: [{domainId, verdictKey, question}] — pick the verse that matches
     the most themes; ties broken by a hash of the questions so the same
     questions always give the same verse. avoidIdx keeps it different from
     the landing verse. */
  function farewell(answers, avoidIdx) {
    var want = {}, seedText = '';
    (answers || []).forEach(function (a, i) {
      var T = THEMES[a.domainId]; if (!T) return;
      var w = i === 0 ? 1.0 : 0.8;
      T[lean(a.verdictKey)].forEach(function (th, j) { want[th] = (want[th] || 0) + w * (j === 0 ? 1.5 : 1); });
      seedText += '|' + a.domainId + ':' + a.verdictKey + ':' + (a.question || '');
    });
    if (!Object.keys(want).length) DEFAULT_THEMES.forEach(function (th) { want[th] = 1; });
    var seed = hash('bye' + seedText);
    var best = null, bestScore = -1;
    ALL.forEach(function (q, idx) {
      if (idx === avoidIdx) return;
      var score = 0;
      q.th.forEach(function (th) { score += want[th] || 0; });
      // tiny deterministic jitter breaks ties without changing the ranking
      score += ((hash(seed + ':' + idx) % 1000) / 1000) * 0.01;
      if (score > bestScore) { bestScore = score; best = idx; }
    });
    return { idx: best, q: ALL[best], themes: Object.keys(want) };
  }

  root.Quotes = { ALL: ALL, daily: daily, random: random, farewell: farewell, THEMES: THEMES };
})(window);
