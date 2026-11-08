"""The demo world: real artists from art history, whose works are in the public domain, to see the app full.

The artists and their works are real (Wikidata for the facts: title, year, medium, size in cm, collection; Wikimedia
Commons for the images, all public domain). The galleries and shows they appear in are made up. Run from the repo root:
    python studio/app/make_world.py
writes studio/app/data/demo/world.json and the images under studio/app/data/demo/. Dates in world.json are days from
today (the app turns them into dates), so the demo's shows stay on now. The choice of works is kept in world.json;
add --fresh to choose again from Wikidata (the best-known works first)."""
import io, json, re, shutil, sys, time, urllib.parse, urllib.request
from datetime import date
from pathlib import Path
from PIL import Image

OUT = Path('studio/app/data/demo')
UA = {'User-Agent': 'OpenStudio/1.0 (https://eladamsalem.com/open-studio/; ooopenstudio@gmail.com)'}
EDGE, THUMB = 1600, 480                     # long edge of a work's image, and of its small copy
PER = 6                                     # works per new artist
PER_FIRST = 8                               # works per artist of the first ten (topped up from Wikidata)
QUALITY = 80                                # JPEG quality: phone-sane sizes
LAST_YEAR = 1928                            # only works made by 1928 (public domain in the US as well)

ARTISTS = [  # Wikidata id, and how the app introduces them (in our words)
    ('Q5582', 'vincent-van-gogh', 'Vincent van Gogh', 'Painting', 'Arles', 'France',
     'Painted fields, orchards and night skies in thick, fast strokes, most of them in his last three years, in the south of France.'),
    ('Q5589', 'henri-matisse', 'Henri Matisse', 'Painting', 'Nice', 'France',
     'Made colour do the work of drawing: flat, bright fields that hold a room, a window, a body.'),
    ('Q535', 'victor-hugo', 'Victor Hugo', 'Works on paper', 'Guernsey', 'United Kingdom',
     'The novelist drew in private all his life: storms, castles and dark seas in ink, coffee and soot.'),
    ('Q296', 'claude-monet', 'Claude Monet', 'Painting', 'Giverny', 'France',
     'Painted the same subject at every hour to catch the light as it changed: haystacks, cathedrals, the water lilies of his own pond.'),
    ('Q5586', 'katsushika-hokusai', 'Katsushika Hokusai', 'Prints & painting', 'Edo', 'Japan',
     'Made thousands of prints and paintings over seventy years, among them the wave and the thirty-six views of Mount Fuji.'),
    ('Q105320', 'berthe-morisot', 'Berthe Morisot', 'Painting', 'Paris', 'France',
     'A founder of Impressionism: quick, airy paintings of women, gardens and rooms, close to the people in them.'),
    ('Q173223', 'mary-cassatt', 'Mary Cassatt', 'Painting & prints', 'Paris', 'France',
     'An American in Paris, she painted and printed the everyday life of women and children with an unsentimental eye.'),
    ('Q436267', 'hilma-af-klint', 'Hilma af Klint', 'Painting', 'Stockholm', 'Sweden',
     'Painted abstraction years before it had a name: vast, coded canvases she asked to keep hidden until long after her death.'),
    ('Q156889', 'suzanne-valadon', 'Suzanne Valadon', 'Painting', 'Montmartre', 'France',
     'A painters\' model who became a painter: frank nudes, portraits and still lifes in strong outline and colour.'),
    ('Q234370', 'paula-modersohn-becker', 'Paula Modersohn-Becker', 'Painting', 'Worpswede', 'Germany',
     'Painted women, children and herself with a plainness and weight that were new; the first woman to paint herself nude.'),
    # --- the second round: women and men, from many countries and centuries ---
    ('Q212657', 'artemisia-gentileschi', 'Artemisia Gentileschi', 'Painting', 'Naples', 'Italy',
     'The first woman admitted to the academy in Florence; her heroines, Judith and Susanna, hold the canvas with a force few men matched.'),
    ('Q213163', 'elisabeth-vigee-le-brun', 'Élisabeth Vigée Le Brun', 'Painting', 'Paris', 'France',
     'Painter to Marie Antoinette; she lived by portraits and carried her studio through the Revolution and across Europe.'),
    ('Q232423', 'judith-leyster', 'Judith Leyster', 'Painting', 'Haarlem', 'Netherlands',
     'A master in the Haarlem guild with her own workshop: lively musicians, drinkers and children, lit by a candle.'),
    ('Q123098', 'angelica-kauffman', 'Angelica Kauffman', 'Painting', 'Rome', 'Switzerland',
     'A founding member of the Royal Academy in London, she painted myth and history, a field then closed to most women.'),
    ('Q241732', 'rosa-bonheur', 'Rosa Bonheur', 'Painting', 'Thomery', 'France',
     'The most famous animal painter of her century, who studied horses in the markets and slaughterhouses of Paris.'),
    ('Q253446', 'anna-ancher', 'Anna Ancher', 'Painting', 'Skagen', 'Denmark',
     'Painted the fishing village of Skagen from inside its rooms: the light in a blue room, a seamstress, a maid at work.'),
    ('Q263025', 'harriet-backer', 'Harriet Backer', 'Painting', 'Oslo', 'Norway',
     'Norway\'s great painter of interiors: lamp-lit rooms and church pews, in a colour that is all her own.'),
    ('Q274339', 'gwen-john', 'Gwen John', 'Painting', 'Meudon', 'United Kingdom',
     'A Welsh painter who lived in Paris and made small, quiet pictures of women in rooms, with a very still gaze.'),
    ('Q236038', 'sofonisba-anguissola', 'Sofonisba Anguissola', 'Painting', 'Cremona', 'Italy',
     'A noblewoman from Cremona who became a court painter in Madrid; her family portraits and self-portraits seem to speak.'),
    ('Q464300', 'eva-gonzales', 'Eva Gonzalès', 'Painting', 'Paris', 'France',
     'Manet\'s only formal pupil, who painted boxes at the theatre, girls and mirrors; she died at thirty-four.'),
    ('Q464016', 'marianne-von-werefkin', 'Marianne von Werefkin', 'Painting', 'Ascona', 'Switzerland',
     'A Russian painter in Munich whose flat colours and dark outlines helped to shape German Expressionism.'),
    ('Q142472', 'kathe-kollwitz', 'Käthe Kollwitz', 'Prints & drawing', 'Berlin', 'Germany',
     'Her etchings and lithographs of hunger, grief and mothers are some of the strongest social art of her century.'),
    ('Q265398', 'clara-peeters', 'Clara Peeters', 'Painting', 'Antwerp', 'Belgium',
     'One of the first painters of still life: cheeses, fish and goblets in cool light, with her own face in the reflection.'),
    ('Q5580', 'albrecht-durer', 'Albrecht Dürer', 'Prints & painting', 'Nuremberg', 'Germany',
     'Made the print a great art: engravings and woodcuts of a precision, and a rhinoceros, that Europe had not seen.'),
    ('Q5598', 'rembrandt', 'Rembrandt van Rijn', 'Painting & prints', 'Amsterdam', 'Netherlands',
     'The master of light and shadow and of the human face, in portraits, biblical scenes and, to the end, himself.'),
    ('Q41264', 'johannes-vermeer', 'Johannes Vermeer', 'Painting', 'Delft', 'Netherlands',
     'About thirty-six paintings survive: quiet rooms, a window, one or two people, and a light you can almost touch.'),
    ('Q5432', 'francisco-goya', 'Francisco Goya', 'Painting & prints', 'Madrid', 'Spain',
     'A court painter who turned to war, madness and dreams, in paintings and prints made at the edge of what could be shown.'),
    ('Q200798', 'utagawa-hiroshige', 'Utagawa Hiroshige', 'Prints', 'Edo', 'Japan',
     'Made the roads, rain and snow of Japan into woodblock prints; Van Gogh copied him.'),
    ('Q40599', 'edouard-manet', 'Édouard Manet', 'Painting', 'Paris', 'France',
     'The painter who shocked Paris with a picnic and a nude, and opened the way for the Impressionists.'),
    ('Q46373', 'edgar-degas', 'Edgar Degas', 'Painting & pastel', 'Paris', 'France',
     'Dancers, bathers, a café: modern Paris seen from an odd angle, with a draughtsman\'s line and a gift for pastel.'),
    ('Q35548', 'paul-cezanne', 'Paul Cézanne', 'Painting', 'Aix-en-Provence', 'France',
     'Built pictures from patches of colour: apples, card players and a mountain, the root of modern painting.'),
    ('Q134741', 'camille-pissarro', 'Camille Pissarro', 'Painting', 'Éragny', 'France',
     'The elder of the Impressionists, who showed in all eight of their exhibitions: fields, rivers and rainy boulevards.'),
    ('Q41406', 'edvard-munch', 'Edvard Munch', 'Painting & prints', 'Oslo', 'Norway',
     'Painted fear, longing and jealousy as the colours of a landscape; The Scream is only the best known.'),
    ('Q61064', 'wassily-kandinsky', 'Wassily Kandinsky', 'Painting', 'Munich', 'Russia',
     'Left a career in law at thirty and made some of the first pictures with no subject but colour and line.'),
    ('Q172911', 'ilya-repin', 'Ilya Repin', 'Painting', 'Saint Petersburg', 'Russia',
     'Painted Russia at work, in protest and in prayer, on large canvases crowded with faces.'),
    ('Q333453', 'raja-ravi-varma', 'Raja Ravi Varma', 'Painting', 'Kilimanoor', 'India',
     'Brought oil painting and European realism to Indian subjects: queens, gods and women, printed for the whole country.'),
]
# titles Wikidata has only in the museum's own language (Nationalmuseum, Stockholm, keeps Hugo's drawings in Swedish)
TITLES = {'Q110750910': 'Medieval Castle', 'Q110763679': 'A Magistrate', 'Q110782790': 'Steep Street in Moonlight',
          'Q110782795': 'Gust of Wind', 'Q110782792': 'Landscape with a Group of Trees', 'Q110782799': 'Imaginary Figure'}
# what Wikidata lacks or says in another language, set by hand (by work slug); DROP: items that are not one finished work
FIXES = {
    'the-fif': dict(title='The Fifer'), 'el-retorno-del-hijo-gey': dict(title='The Return of the Prodigal Son'),
    'madame-grand-noel-catherine-verlee': dict(title='Madame Grand'),
    'the-bellelli-family': dict(year='1867'), 'the-jewish-bride': dict(collection='Rijksmuseum'),
    'the-storm-on-the-sea-of-galilee': dict(collection='Isabella Stewart Gardner Museum'),
    'self-portrait-by-judith-leyster': dict(title='Self-portrait', collection='National Gallery of Art'),
    'the-scream': dict(medium='Tempera and crayon on cardboard'), 'madonna': dict(medium='Oil on canvas'),
    'self-portrait-with-fur-trimmed-robe': dict(medium='Oil on panel'),
    'tokaido-gojusan-tsui-kanaya': dict(title='Kanaya, from the Fifty-three Stations of the Tōkaidō'),
    'reseskiss-studie-av-balustrad': dict(title='Travel Sketch: Study of a Balustrade'),
    'zertretene-leichnam-und-frauenakt-am-pfahl-the-d': dict(title='The Downtrodden', medium='Etching on paper'),
    'brot-bread': dict(title='Bread!', medium='Lithograph'), 'gefallen-killed-in-action-or-news-from-the-front': dict(title='Killed in Action', medium='Woodcut'),
    'lovers-ii': dict(medium='Woodcut'), 'the-card-players': dict(medium='Oil on canvas'),
    'selbstbildnis-self-portrait': dict(title='Self-Portrait', medium='Woodcut'),
    'woman-with-a-parasol-madame-monet-and-her-son': dict(collection='National Gallery of Art'),
    'little-girl-in-a-blue-armchair': dict(collection='National Gallery of Art'), 'the-boating-party': dict(collection='National Gallery of Art'),
    'girl-arranging-her-hair': dict(collection='National Gallery of Art'), 'woman-with-a-sunflower': dict(collection='National Gallery of Art'),
    'the-port-at-lorient': dict(collection='National Gallery of Art'), 'the-mother-and-sister-of-the-artist': dict(collection='National Gallery of Art'),
}
for _s in ('medieval-castle', 'a-magistrate', 'steep-street-in-moonlight', 'gust-of-wind', 'landscape-with-a-group-of-trees', 'imaginary-figure',
           'reseskiss-studie-av-balustrad', 'spots-and-frottage'):
    FIXES.setdefault(_s, {}).setdefault('medium', 'Drawing on paper')
DROP = {'Q27951197'}
UNITS = {'Q174728': 1, 'Q174789': 0.1, 'Q11573': 100, 'Q218593': 2.54}       # cm, mm, m, inch → cm

# the shows: made-up galleries (the ones the demo has always had), now showing the real artists
SHOWS = [
    dict(slug='orchards-in-bloom', title='Orchards in Bloom', artists=['vincent-van-gogh'], kind='gallery', venue='Harbour Gallery',
         address='Ha-Atsmaut Rd 41, Haifa', city='Haifa', at=[32.8193, 34.999], start=0, end=45, hours='Tue–Sat 11:00–19:00',
         events=[dict(day=0, time='20:00', what='Opening')], text='Van Gogh in the south: the fields, the night and the faces of Arles, in paintings from his last years.'),
    dict(slug='open-window', title='The Open Window', artists=['henri-matisse'], kind='gallery', venue='Rope Street Gallery',
         address='Rope St 7, Jaffa', city='Jaffa', at=[32.0527, 34.7563], start=-12, end=6, hours='Mon–Fri 10:00–18:00, Sat 11:00–14:00',
         events=[dict(day=5, time='19:00', what='Closing night')], text='Matisse and the room: windows, interiors and the people in them, in colour that holds the wall.'),
    dict(slug='hours-of-light', title='Hours of Light', artists=['claude-monet'], kind='gallery', venue='Studio 5',
         address='Levontin St 5, Tel Aviv', city='Tel Aviv', at=[32.0628, 34.774], start=2, end=50, hours='Wed–Sat 12:00–20:00',
         events=[dict(day=2, time='19:00', what='Opening')], text='Monet at every hour: the same places painted again and again as the light moves over them.'),
    dict(slug='ink-and-storm', title='Ink and Storm', artists=['victor-hugo', 'katsushika-hokusai'], kind='gallery', venue='Musrara Lane Gallery',
         address='Ha-Neviim St 60, Jerusalem', city='Jerusalem', at=[31.7838, 35.2265], start=-26, end=3, hours='Sun–Thu 10:00–18:00, Fri 10:00–13:00',
         events=[dict(day=2, time='18:00', what='Talk')], text='Two masters of the wave and the dark sky: Victor Hugo\'s private drawings beside Hokusai\'s prints.'),
    dict(slug='women-at-home', title='Women at Home', artists=['berthe-morisot', 'mary-cassatt'], kind='gallery', venue='Courtyard Hall',
         address='Rothschild Blvd 70, Tel Aviv', city='Tel Aviv', at=[32.0663, 34.7748], start=6, end=40, hours='Tue–Sat 11:00–19:00',
         events=[dict(day=6, time='19:30', what='Opening')], text='Two Impressionists, friends in Paris, paint the life of women from inside the rooms they lived in.'),
    dict(slug='paintings-for-the-future', title='Paintings for the Future', artists=['hilma-af-klint'], kind='online', venue='Online',
         city='', at=None, start=-4, end=60, hours='Open all the time', events=[dict(day=1, time='21:00', what='Online talk')],
         text='Hilma af Klint\'s abstract paintings, made for a public she believed would come long after her. Only online.'),
    dict(slug='seen-from-within', title='Seen from Within', artists=['suzanne-valadon', 'paula-modersohn-becker', 'berthe-morisot', 'mary-cassatt'],
         kind='online', venue='Online', city='', at=None, start=-2, end=30, hours='Open all the time', events=[], curator='Open Studio',
         text='A concept exhibition: four women painters who looked at bodies, children and themselves without the usual flattery. Curated on Open Studio.'),
    dict(slug='a-model-paints', title='A Model Paints', artists=['suzanne-valadon'], kind='gallery', venue='Salt Room',
         address='Yefet St 30, Jaffa', city='Jaffa', at=[32.05, 34.7537], start=-420, end=-380, hours='', events=[],
         text='Suzanne Valadon, who sat for Renoir and Toulouse-Lautrec, and painted her own way.'),
    dict(slug='worpswede', title='Worpswede', artists=['paula-modersohn-becker'], kind='gallery', venue='Harbour Gallery',
         address='Ha-Atsmaut Rd 41, Haifa', city='Haifa', at=[32.8193, 34.999], start=-560, end=-515, hours='', events=[],
         text='Paintings from the artists\' village on the moor, where Paula Modersohn-Becker found her plain, heavy forms.'),
    # --- made-up galleries, for the second round of artists ---
    dict(slug='lamplight-and-window', title='Lamplight and Window', artists=['johannes-vermeer', 'rembrandt', 'judith-leyster', 'clara-peeters'], kind='gallery',
         venue='Stone House Gallery', address='Alkabetz St 12, Safed', city='Safed', at=[32.9646, 35.496], start=-8, end=52, hours='Sun–Thu 10:00–17:00, Fri 10:00–13:00',
         events=[dict(day=3, time='18:30', what='Talk')], text='The Dutch Golden Age indoors: a window, a candle, a table laid, and the people and things in their light.'),
    dict(slug='courage-on-canvas', title='Courage on Canvas', artists=['artemisia-gentileschi', 'sofonisba-anguissola', 'angelica-kauffman', 'elisabeth-vigee-le-brun'], kind='gallery',
         venue='Lantern Room', address='Mamilla Ave 9, Jerusalem', city='Jerusalem', at=[31.7787, 35.2236], start=3, end=44, hours='Sun–Thu 11:00–19:00, Fri 10:00–13:00',
         events=[dict(day=3, time='19:00', what='Opening')], text='Four women who made themselves painters in the courts and studios of Europe, from the 1550s to the 1780s.'),
    dict(slug='north-light', title='North Light', artists=['anna-ancher', 'harriet-backer', 'edvard-munch'], kind='gallery',
         venue='Wadi Gallery', address='Ha-Hagana St 8, Haifa', city='Haifa', at=[32.8225, 34.991], start=-20, end=9, hours='Tue–Sat 11:00–19:00',
         events=[dict(day=8, time='19:00', what='Closing night')], text='Three painters of the north: the quiet rooms of Skagen and Oslo, and the same long evenings turned into fear.'),
    dict(slug='people-at-work', title='People at Work', artists=['ilya-repin', 'rosa-bonheur', 'kathe-kollwitz'], kind='gallery',
         venue='Carmel Market Loft', address='Ha-Carmel St 25, Tel Aviv', city='Tel Aviv', at=[32.0688, 34.7685], start=-3, end=25, hours='Wed–Sat 12:00–20:00',
         events=[dict(day=4, time='19:00', what='Talk')], text='Haulers, ploughmen, mothers: painters and printers who looked at labour and hardship and did not look away.'),
    dict(slug='prints-across-the-sea', title='Prints Across the Sea', artists=['albrecht-durer', 'utagawa-hiroshige', 'kathe-kollwitz'], kind='gallery',
         venue='Musrara Lane Gallery', address='Ha-Neviim St 60, Jerusalem', city='Jerusalem', at=[31.7838, 35.2265], start=10, end=70, hours='Sun–Thu 10:00–18:00, Fri 10:00–13:00',
         events=[dict(day=10, time='18:30', what='Opening')], text='The woodcut, the engraving, the woodblock print and the lithograph, from Nuremberg to Edo to Berlin.'),
    dict(slug='a-room-of-her-own', title='A Room of Her Own', artists=['gwen-john', 'marianne-von-werefkin', 'eva-gonzales', 'anna-ancher'], kind='online', venue='Online',
         city='', at=None, start=-1, end=90, hours='Open all the time', events=[], curator='Open Studio',
         text='A concept exhibition: women painters and the rooms, windows and mirrors they made their own. Curated on Open Studio.'),
    dict(slug='colour-without-a-subject', title='Colour Without a Subject', artists=['wassily-kandinsky', 'marianne-von-werefkin', 'hilma-af-klint'], kind='online', venue='Online',
         city='', at=None, start=-6, end=40, hours='Open all the time', events=[dict(day=6, time='20:00', what='Online talk')], curator='Open Studio',
         text='Where painting leaves the world behind: Kandinsky\'s improvisations beside Hilma af Klint, and Werefkin\'s flat, dark colour. Curated on Open Studio.'),
    dict(slug='dark-rooms', title='Dark Rooms', artists=['francisco-goya', 'rembrandt', 'artemisia-gentileschi'], kind='gallery', venue='Salt Room',
         address='Yefet St 30, Jaffa', city='Jaffa', at=[32.05, 34.7537], start=-40, end=-5, hours='', events=[],
         text='Violence, grief and a single source of light: three painters who worked in the dark.'),
    dict(slug='gods-and-queens', title='Gods and Queens', artists=['raja-ravi-varma'], kind='gallery', venue='Rope Street Gallery',
         address='Rope St 7, Jaffa', city='Jaffa', at=[32.0527, 34.7563], start=15, end=60, hours='Mon–Fri 10:00–18:00, Sat 11:00–14:00',
         events=[dict(day=15, time='19:00', what='Opening')], text='Raja Ravi Varma, who brought oil painting to Indian myth and portrait.'),
    dict(slug='rain-and-wave', title='Rain and Wave', artists=['utagawa-hiroshige', 'katsushika-hokusai'], kind='gallery', venue='Harbour Gallery',
         address='Ha-Atsmaut Rd 41, Haifa', city='Haifa', at=[32.8193, 34.999], start=20, end=80, hours='Tue–Sat 11:00–19:00',
         events=[dict(day=20, time='19:30', what='Opening')], text='Two masters of the Japanese landscape print, a generation apart, and the weather in them.'),
    dict(slug='modern-paris', title='Modern Paris', artists=['edouard-manet', 'edgar-degas', 'eva-gonzales'], kind='gallery', venue='Studio 5',
         address='Levontin St 5, Tel Aviv', city='Tel Aviv', at=[32.0628, 34.774], start=-14, end=18, hours='Wed–Sat 12:00–20:00',
         events=[dict(day=5, time='19:00', what='Talk')], text='Cafés, theatre boxes and ballet rehearsals: the city that Manet taught his friends and his pupil to see.'),
    # --- real exhibitions of history, with the dates and places they had (the artists in them are the ones this demo has) ---
    dict(slug='first-impressionist-exhibition-1874', title='The First Impressionist Exhibition', artists=['claude-monet', 'berthe-morisot', 'edgar-degas', 'paul-cezanne', 'camille-pissarro'],
         kind='gallery', venue="Nadar's former studio", address='35 Boulevard des Capucines, Paris', city='Paris', country='France', at=None,
         date=((1874, 4, 15), (1874, 5, 15)), real=True, hours='', events=[],
         text='A real exhibition: 15 April to 15 May 1874, thirty artists who had left the official Salon showed their own work. A critic mocked Monet\'s Impression, Sunrise, and the name Impressionism was born.'),
    dict(slug='eighth-impressionist-exhibition-1886', title='The Eighth Impressionist Exhibition', artists=['berthe-morisot', 'edgar-degas', 'camille-pissarro', 'mary-cassatt'],
         kind='gallery', venue='1 rue Laffitte', address='1 rue Laffitte, Paris', city='Paris', country='France', at=None,
         date=((1886, 5, 15), (1886, 6, 15)), real=True, hours='', events=[],
         text='A real exhibition: 15 May to 15 June 1886, the last of the group. Seurat\'s A Sunday Afternoon on La Grande Jatte was shown here.'),
    dict(slug='salon-des-refuses-1863', title='Salon des Refusés', artists=['edouard-manet', 'paul-cezanne', 'camille-pissarro'],
         kind='gallery', venue="Palais de l'Industrie", address="Palais de l'Industrie, Champs-Élysées, Paris", city='Paris', country='France', at=None,
         date=((1863, 5, 15), (1863, 7, 5)), real=True, skip=['olympia'], hours='', events=[],
         text='A real exhibition: opened 15 May 1863 (the closing date here is approximate), by order of Napoleon III, for the paintings the official Salon jury had refused. Manet\'s Luncheon on the Grass was the scandal of it.'),
    dict(slug='armory-show-1913', title='The Armory Show', artists=['vincent-van-gogh', 'henri-matisse', 'paul-cezanne', 'mary-cassatt', 'wassily-kandinsky', 'gwen-john'],
         kind='gallery', venue='69th Regiment Armory', address='Lexington Avenue at 25th Street, New York', city='New York', country='United States', at=None,
         date=((1913, 2, 17), (1913, 3, 15)), real=True, hours='', events=[],
         text='A real exhibition: 17 February to 15 March 1913, the first large show of European modern art in America, with some 1,300 works. Many Americans met Van Gogh, Matisse and Cézanne here.'),
    dict(slug='sonderbund-1912', title='Sonderbund International Art Exhibition', artists=['edvard-munch', 'vincent-van-gogh', 'paul-cezanne'],
         kind='gallery', venue='Ausstellungshalle am Aachener Tor', address='Aachener Tor, Cologne', city='Cologne', country='Germany', at=None,
         date=((1912, 5, 25), (1912, 9, 30)), real=True, hours='', events=[],
         text='A real exhibition: 25 May to 30 September 1912, in which Van Gogh, Cézanne and Munch were shown among the young painters who followed them.'),
    dict(slug='blue-rider-1911', title='First Exhibition of the Blue Rider', artists=['wassily-kandinsky'],
         kind='gallery', venue='Moderne Galerie Thannhauser', address='Theatinerstraße 7, Munich', city='Munich', country='Germany', at=None,
         date=((1911, 12, 18), (1912, 1, 1)), real=True, hours='', events=[],
         text='A real exhibition: 18 December 1911 to 1 January 1912, the first show of the Blue Rider group that Kandinsky founded with Franz Marc.'),
]


def get(url, tries=4):
    for i in range(tries):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90).read()
        except Exception as e:
            if i == tries - 1: raise
            time.sleep(3 * (i + 1))


def sparql(q):
    return json.loads(get('https://query.wikidata.org/sparql?format=json&query=' + urllib.parse.quote(q)))['results']['bindings']


def candidates(qid):
    """An artist's works that have an image and a measured size, best known first."""
    rows = sparql(f"""SELECT ?w ?wLabel ?img ?h ?hu ?x ?xu ?inc ?matLabel ?col ?colLabel ?links ?instLabel WHERE {{
      ?w wdt:P170 wd:{qid}; wdt:P18 ?img; wikibase:sitelinks ?links; rdfs:label ?wLabel;
         p:P2048/psv:P2048 [ wikibase:quantityAmount ?h; wikibase:quantityUnit ?hu ];
         p:P2049/psv:P2049 [ wikibase:quantityAmount ?x; wikibase:quantityUnit ?xu ].
      FILTER(lang(?wLabel) = "en")
      OPTIONAL {{ ?w wdt:P571 ?inc }}
      OPTIONAL {{ ?w wdt:P186 ?mat. ?mat rdfs:label ?matLabel FILTER(lang(?matLabel) = "en") }}
      OPTIONAL {{ ?w wdt:P31 ?inst. ?inst rdfs:label ?instLabel FILTER(lang(?instLabel) = "en") }}
      OPTIONAL {{ ?w wdt:P195 ?col. OPTIONAL {{ ?col rdfs:label ?colLabel FILTER(lang(?colLabel) = "en") }} }}
    }} ORDER BY DESC(?links) LIMIT 1500""")
    seen, out = set(), []
    for r in rows:
        wid = r['w']['value'].rsplit('/', 1)[-1]
        if wid in seen: continue
        hu, xu = r['hu']['value'].rsplit('/', 1)[-1], r['xu']['value'].rsplit('/', 1)[-1]
        if hu not in UNITS or xu not in UNITS: continue
        title = TITLES.get(wid) or r['wLabel']['value'].replace('_', ' ').replace('Selfportrait', 'Self-portrait').strip()
        # a series or a group of paintings is not one work
        if title == wid or re.search(r'^untitled|\bseries\b|\bpaintings\b|\bversions?\b', title, re.I): continue
        h, w = float(r['h']['value']) * UNITS[hu], float(r['x']['value']) * UNITS[xu]
        if not (8 <= h <= 600 and 8 <= w <= 600): continue
        seen.add(wid)
        mats = sorted({x['matLabel']['value'].lower() for x in rows if x['w']['value'] == r['w']['value'] and 'matLabel' in x}
                      | {x['instLabel']['value'].lower() for x in rows if x['w']['value'] == r['w']['value'] and 'instLabel' in x})
        col = r.get('col', {}).get('value', '').rsplit('/', 1)[-1]
        yr = (r.get('inc', {}).get('value', '') or '')[:4].lstrip('+')
        if not yr.isdigit() or int(yr) > LAST_YEAR: continue
        out.append(dict(wikidata=wid, title=title, h=round(h, 1), w=round(w, 1),
                        year=(r.get('inc', {}).get('value', '') or '')[:4].lstrip('+'),
                        medium=medium(mats, qid), collection='Private collection' if col == 'Q768717' else r.get('colLabel', {}).get('value', ''),
                        file=urllib.parse.unquote(r['img']['value'].rsplit('/', 1)[-1])))
    return out


def medium(m, qid):
    """Wikidata's materials, as a label says them: 'Oil on canvas', 'Pastel on paper'."""
    m = set(m)
    if qid in ('Q5586', 'Q200798') and ('paper' in m or 'prussian blue' in m or 'wood' in m or 'woodblock print' in m or 'ukiyo-e' in m): return 'Woodblock print'
    for t, label in (('woodcut', 'Woodcut'), ('engraving', 'Engraving'), ('etching', 'Etching'), ('drypoint', 'Drypoint'), ('lithograph', 'Lithograph'),
                     ('mezzotint', 'Mezzotint'), ('aquatint', 'Aquatint'), ('woodblock print', 'Woodblock print')):
        if any(t in x for x in m): return label + (' on paper' if label != 'Woodblock print' else '')
    paint = next((p for p in ('oil paint', 'tempera', 'pastel', 'watercolor paint', 'ink', 'gouache', 'graphite', 'charcoal') if p in m), '')
    names = {'oil paint': 'Oil', 'watercolor paint': 'Watercolour'}
    support = next((s for s in ('canvas', 'paper', 'cardboard', 'panel', 'wood', 'oak panel') if s in m), '')
    if paint == 'oil paint' and 'tempera' in m: return f'Oil and tempera on {support or "canvas"}'
    if paint: return f'{names.get(paint, paint.capitalize())} on {"panel" if support in ("wood", "oak panel") else support}' if support else names.get(paint, paint.capitalize())
    if 'tempera' in m: return f'Tempera on {support}' if support else 'Tempera'
    return f'On {support}' if support else ''


def big_enough(file, edge=1400):
    """The image Commons has is large enough to show a work well."""
    d = json.loads(get('https://commons.wikimedia.org/w/api.php?format=json&action=query&prop=imageinfo&iiprop=size&titles=' + urllib.parse.quote('File:' + file)))
    info = next(iter(d['query']['pages'].values())).get('imageinfo', [{}])[0]
    return max(info.get('width', 0), info.get('height', 0)) >= edge


def slugify(s):
    import re, unicodedata
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')[:48] or 'work'


def image(file, w_cm, h_cm, dest, small):
    """A Commons file, scaled by Commons to the long edge and kept here as two JPEGs: the work and its small copy."""
    width = EDGE if w_cm >= h_cm else max(64, round(EDGE * w_cm / h_cm))
    try: data = get(f'https://commons.wikimedia.org/wiki/Special:FilePath/{urllib.parse.quote(file)}?width={width}')
    except Exception: data = get(f'https://commons.wikimedia.org/wiki/Special:FilePath/{urllib.parse.quote(file)}')
    im = Image.open(io.BytesIO(data)); im.load()
    im = im.convert('RGB')
    for path, edge in ((dest, EDGE), (small, THUMB)):
        k = edge / max(im.size)
        x = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS) if k < 1 else im
        x.save(path, 'JPEG', quality=QUALITY if edge == EDGE else 74, optimize=True, progressive=True)
    time.sleep(1.5)


def portrait(qid, slug):
    rows = sparql(f'SELECT ?img WHERE {{ wd:{qid} wdt:P18 ?img }} LIMIT 1')
    if not rows: return ''
    file = urllib.parse.unquote(rows[0]['img']['value'].rsplit('/', 1)[-1])
    (OUT / 'people').mkdir(parents=True, exist_ok=True)
    (OUT / 'people' / f'{slug}.jpg').write_bytes(get(f'https://commons.wikimedia.org/wiki/Special:FilePath/{urllib.parse.quote(file)}?width=600'))
    return f'data/demo/people/{slug}.jpg', file


FIRST = [a[1] for a in ARTISTS[:10]]
SKIP = re.compile(r'^the ten largest', re.I)           # (Hilma af Klint: one series of ten is enough)


def days(d):
    return (date(*d) - date.today()).days


def main():
    old = OUT / 'world.json'
    prev = json.loads(old.read_text(encoding='utf-8')) if old.exists() and '--fresh' not in sys.argv else {}
    kept = {w['wikidata']: w for w in prev.get('works', []) if w.get('wikidata')}
    if '--fresh' in sys.argv: shutil.rmtree(OUT / 'works', ignore_errors=True)
    (OUT / 'works').mkdir(parents=True, exist_ok=True)
    artists, works, thumbs, used = [], [], {}, {w['slug'] for w in kept.values()}
    for qid, slug, name, discipline, city, country, about in ARTISTS:
        p = portrait(qid, slug) if not (OUT / 'people' / f'{slug}.jpg').exists() else (f'data/demo/people/{slug}.jpg', next((a['portrait_source'].split('File:')[-1] for a in prev.get('artists', []) if a['slug'] == slug), ''))
        artists.append(dict(slug=slug, name=name, discipline=discipline, city=city, country=country, statement=about,
                            portrait=p[0] if p else '', wikidata=qid, portrait_source=f'https://commons.wikimedia.org/wiki/File:{p[1]}' if p and p[1] else ''))
        mine = [w for w in kept.values() if w['artist'] == slug and w['wikidata'] not in DROP]
        target = PER_FIRST if slug in FIRST else PER
        if len(mine) < target:
            for c in candidates(qid):
                if c['wikidata'] in {w['wikidata'] for w in mine} or c['wikidata'] in DROP or SKIP.search(c['title']): continue
                if not big_enough(c['file'], 1400 if qid != 'Q535' else 700): continue     # (Hugo's drawings are small)
                ws = slugify(c['title'])
                if ws in used: ws = f'{ws}-{c["year"] or c["wikidata"].lower()}'
                if ws in used: continue
                mine.append(dict(slug=ws, artist=slug, title=c['title'], year=c['year'], medium=c['medium'], size=[c['w'], c['h']],
                                 collection=c['collection'], wikidata=c['wikidata'], source=f'https://commons.wikimedia.org/wiki/File:{c["file"]}', file=c['file']))
                used.add(ws)
                if len(mine) == target: break
        for w in mine:
            w['title'] = TITLES.get(w['wikidata'], w['title'])
            w.update(FIXES.get(w['slug'], {}))
            if slug in ('katsushika-hokusai', 'utagawa-hiroshige') and not w['medium']: w['medium'] = 'Woodblock print'   # (the views are all prints)
            w['image'], small = f'data/demo/works/{w["slug"]}.jpg', f'data/demo/works/{w["slug"]}-s.jpg'
            if not (OUT / 'works' / f'{w["slug"]}.jpg').exists():
                image(w['file'], w['size'][0], w['size'][1], OUT / 'works' / f'{w["slug"]}.jpg', OUT / 'works' / f'{w["slug"]}-s.jpg')
            thumbs[w['image']] = small
            works.append(w)
        print(f'{name}: {len(mine)} works', flush=True)
    by, year_of = {}, {w['slug']: w['year'] for w in works}
    for w in works: by.setdefault(w['artist'], []).append(w['slug'])
    shows = []
    for s in SHOWS:
        s = dict(s); n = 6 if len(s['artists']) == 1 else (2 if len(s['artists']) <= 4 else 2)
        if 'date' in s: s['start_year'] = s['date'][0][0]; s['start'], s['end'] = (days(d) for d in s.pop('date'))
        if s.get('real'):          # a real show lists works the artists had made by then (not the catalogue of the show)
            yr = s['start_year']
            s['works'] = [x for a in s['artists'] for x in [x for x in by.get(a, []) if 0 < int(year_of[x] or 0) <= yr and x not in s.get('skip', ())][:3]]
            s['text'] += ' The works listed are by these artists and were made by then; they are not the show\'s catalogue.'
        else:
            s['works'] = [x for a in s['artists'] for x in by.get(a, [])[:n]]
        s['images'] = [f'data/demo/works/{x}.jpg' for x in s['works'][:2]]
        s.pop('start_year', None)
        shows.append(s)
    world = dict(_note='Demo content: real artists from art history, their works in the public domain (facts from Wikidata, images from '
                       'Wikimedia Commons). Most galleries and shows are made up; the ones marked real are historical exhibitions, with their real dates and places. '
                       'Dates are days from today. Made by studio/app/make_world.py.',
                 artists=artists, works=works, shows=shows, live=[], listings=prev.get('listings', []), places=prev.get('places', {}),
                 venues=prev.get('venues', {}), thumbs=thumbs)
    old.write_text(json.dumps(world, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'{len(artists)} artists, {len(works)} works, {len(shows)} shows')


if __name__ == '__main__':
    main()
