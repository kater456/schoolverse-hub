import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// ── Types ─────────────────────────────────────────────────────────────────────
interface MCQ { id:number;s:number;t:string;type:"mcq";q:string;o:string[];a:number }
interface Match { id:number;s:number;t:string;type:"match";phrase:string;o:string[];a:number }
interface Multi { id:number;s:number;t:string;type:"multi";q:string;st:string[];a:number }
interface AR { id:number;s:number;t:string;type:"ar";assert:string;reason:string;a:number }
type Question = MCQ | Match | Multi | AR;
interface Analysis { score:number;ss:Record<number,number>;sn:Record<number,number>;topics:Record<string,{c:number;n:number}>;text:string }

const LABELS = ["A","B","C","D","E"];
const S3 = ["A — Statements 1, 2 & 3 correct","B — Statements 1 & 3 correct","C — Statements 2 & 4 correct","D — Only statement 4 correct","E — All four statements correct"];
const S4 = ["A — Both true; Reason IS correct explanation","B — Both true; Reason NOT correct explanation","C — Assertion true, Reason false","D — Assertion false, Reason true","E — Both false"];

const SECS: Record<number,{col:string;icon:string;title:string;rule:string}> = {
  1:{col:"#38bdf8",icon:"🍬",title:"Carbohydrate Chemistry",rule:"Select the ONE most correct answer. Some questions may be Matching-type — match the phrase to the correct heading."},
  2:{col:"#c084fc",icon:"💧",title:"Lipid Chemistry & Biomembranes",rule:"Select the ONE most correct answer. Some questions may be Matching-type."},
  3:{col:"#fb923c",icon:"🔗",title:"Amino Acids & Protein Structure",rule:"Select the ONE most correct answer. Some questions may be Multi-Statement type."},
  4:{col:"#f472b6",icon:"🧬",title:"Nucleotides & Molecular Biology",rule:"Select the ONE most correct answer. Matching, Multi-Statement, or MCQ questions may appear."},
  5:{col:"#34d399",icon:"⚗️",title:"Enzymes, Metabolism & Bioenergetics",rule:"Select the ONE most correct answer. Multi-Statement or Assertion-Reason questions may appear."}
};

// ── Question Bank ─────────────────────────────────────────────────────────────
const ALL_Q: Question[] = [
  {id:1,s:1,t:"Carbohydrates",type:"mcq",q:"Two sugars which differ from one another only in configuration around a single carbon atom are termed:",o:["Epimers","Anomers","Optical isomers","Stereoisomers","All of the above"],a:0},
  {id:2,s:1,t:"Carbohydrates",type:"mcq",q:"Which of the following is obtained from fruits, vegetables, and cereals?",o:["Monosaccharides","Sucrose","Cellulose","Starch","Lactose"],a:3},
  {id:3,s:1,t:"Carbohydrates",type:"mcq",q:"If the OH group is to the left of the last stereocenter carbon, the configuration is:",o:["D","L","α","β","None of the above"],a:1},
  {id:4,s:1,t:"Carbohydrates",type:"mcq",q:"Cellulose is made up of repeating units of:",o:["β-1-4 linkage between glucose units","β-1-2 linkage between glucose units","α-1-4 linkage between glucose units","α-1-2 linkage between glucose units","α-1-6 linkage between glucose units"],a:0},
  {id:5,s:1,t:"Carbohydrates",type:"mcq",q:"Which of the following molecules is a furanose in its cyclical form?",o:["Mannose","Fructose","Glucose","Lactose","Sucrose"],a:1},
  {id:6,s:5,t:"Enzymes",type:"mcq",q:"Which of the following is NOT a method of enzyme regulation?",o:["Allosteric Regulation","Proteolytic Cleavage","Feedback Regulation","Regulation by isoenzymes","Regulation by Epimers"],a:4},
  {id:7,s:5,t:"Enzymes",type:"mcq",q:"Homotropic regulation occurs when:",o:["Only the substrate plays a part in enzyme regulation","Both the substrate & allosteric molecule play a part","Only the allosteric molecule plays a part","Only the product plays a part","Both product & allosteric molecule play a part"],a:0},
  {id:8,s:5,t:"Enzymes",type:"mcq",q:"Binding of a Positive Allosteric Molecule:",o:["Has no effect overall","Opens up 2 other active sites","Decreases enzyme activity","Increases chances of substrate binding","Encourages blockage of active site"],a:3},
  {id:9,s:4,t:"Nucleotides & DNA",type:"mcq",q:"One of these is a nucleoside:",o:["Cytosine","Guanosine","Adenine","Thymine","Uracil"],a:1},
  {id:10,s:4,t:"Nucleotides & DNA",type:"mcq",q:"Which of these is NOT a substrate for RNA synthesis?",o:["ATP","GTP","CTP","TTP","UTP"],a:3},
  {id:11,s:4,t:"Nucleotides & DNA",type:"mcq",q:"GTP needs to be reduced at which position to produce dGTP?",o:["3'","2'","5'","Base"],a:1},
  {id:12,s:4,t:"Nucleotides & DNA",type:"mcq",q:"The two strands of DNA are joined by:",o:["Covalent bonds","Hydrogen bonds","Ionic bonds","Phosphodiester bond","Ligase"],a:1},
  {id:13,s:4,t:"Nucleotides & DNA",type:"mcq",q:"Left-handed DNA:",o:["A-DNA","B-DNA","Z-DNA","C-DNA","None of the above"],a:2},
  {id:14,s:5,t:"Bioenergetics",type:"mcq",q:"Every chemical reaction in the body is accompanied by a change in:",o:["Entropy","Enthalpy","Gibbs free energy","Rate of reaction","Temperature"],a:2},
  {id:15,s:5,t:"Bioenergetics",type:"mcq",q:"A reaction cannot occur spontaneously if:",o:["ΔG is positive","ΔG is negative","ΔG is zero","ΔH=E+PV","ΔH=ΔS"],a:0},
  {id:16,s:5,t:"Bioenergetics",type:"mcq",q:"A reaction is said to be exergonic if:",o:["ΔG is negative","ΔG is positive","ΔH=E+PV","ΔG is zero","None of the above"],a:0},
  {id:17,s:5,t:"Bioenergetics",type:"mcq",q:"The sum of ΔG for a coupled reaction must be:",o:["Positive","Negative","Zero","Negligible","One"],a:1},
  {id:18,s:3,t:"Amino Acids",type:"mcq",q:"Which amino acid is involved in the formation of disulfide bonds in proteins?",o:["Methionine","Serine","Glycine","Cysteine","Valine"],a:3},
  {id:19,s:3,t:"Amino Acids",type:"mcq",q:"Amide-containing amino acids include:",o:["Lysine","Alanine","Glutamine","Proline","Glutamic acid"],a:2},
  {id:20,s:5,t:"Coenzymes & Vitamins",type:"mcq",q:"NAD⁺ contains which of the following?",o:["Thiamine","Lipoic acid","Niacin","Riboflavin","CoA"],a:2},
  {id:21,s:5,t:"Coenzymes & Vitamins",type:"mcq",q:"Which molecule acts as an electron carrier in biological systems?",o:["Hemoglobin","CO₂","ATP","NAD","Myoglobin"],a:3},
  {id:22,s:3,t:"Amino Acid Metabolism",type:"mcq",q:"One of these amino acids is strictly glucogenic:",o:["Phenylalanine","Isoleucine","Leucine","Valine","Tryptophan"],a:3},
  {id:23,s:2,t:"Lipids",type:"mcq",q:"Concerning fatty acid nomenclature, one of the following is WRONG:",o:["Unsaturated ones named by adding 'enoic'","All naturally occurring fatty acids are of odd number of carbons","Δ indicates a double bond between carbons 9 and 10","Saturated fatty acids named by adding 'anoic'","They are usually straight chain derivatives"],a:1},
  {id:24,s:2,t:"Lipids",type:"mcq",q:"One of the following is a saturated fatty acid:",o:["Arachidic acid","Linoleic acid","Linolenic acid","Arachidonic acid","Palmitoleic acid"],a:0},
  {id:25,s:2,t:"Lipids",type:"mcq",q:"One of the following is NOT a phospholipid:",o:["Lecithin","Cephalin","Ganglioside","Sphingomyelin","Phosphatidylserine"],a:2},
  {id:26,s:2,t:"Lipids",type:"mcq",q:"Concerning glycolipids, one statement is FALSE:",o:["It is a complex lipid","They contain sphingosine","They include cerebroside and ganglioside","They contain a carbohydrate moiety","They contain glycerol"],a:4},
  {id:27,s:2,t:"Lipids",type:"mcq",q:"Concerning the structure of sphingomyelin, it contains:",o:["A fatty acid joined to glycerol","A long-chain alcohol joined to Isoprene units","Ceramide joined to phosphoryl group","A carbohydrate joined to a phosphate group","Proteins"],a:2},
  {id:28,s:2,t:"Lipids",type:"mcq",q:"Derived lipids include all EXCEPT:",o:["Fatty acids","Cholesterol","Steroids","Prostaglandin","Wax"],a:4},
  {id:29,s:4,t:"Molecular Biology",type:"mcq",q:"Renaturation can be brought about by:",o:["Increase in temperature","Addition of extra ions","Removal of ions","De-concentration of DNA molecules","UV rays absorbance"],a:1},
  {id:30,s:5,t:"Enzymes",type:"mcq",q:"Monoxygenases are also known as:",o:["Hydroperoxidases","Peroxidases","Mixed function oxidases","Anaerobic dehydrogenases","Ligases"],a:2},
  {id:31,s:5,t:"Enzymes & Coenzymes",type:"match",phrase:"Transamination reaction",o:["Cytochrome P450 monoxygenases","Biotin","Catalase","Pyridoxal phosphate","Oxidoreductases"],a:3},
  {id:32,s:5,t:"Enzymes & Coenzymes",type:"match",phrase:"Destruction of H₂O₂",o:["Cytochrome P450 monoxygenases","Biotin","Catalase","Pyridoxal phosphate","Oxidoreductases"],a:2},
  {id:33,s:5,t:"Enzymes & Coenzymes",type:"match",phrase:"Transfer of electrons from donor to acceptor",o:["Cytochrome P450 monoxygenases","Biotin","Catalase","Pyridoxal phosphate","Oxidoreductases"],a:4},
  {id:34,s:5,t:"Enzymes & Coenzymes",type:"match",phrase:"Carboxylation reactions",o:["Cytochrome P450 monoxygenases","Biotin","Catalase","Pyridoxal phosphate","Oxidoreductases"],a:1},
  {id:35,s:5,t:"Enzymes & Coenzymes",type:"match",phrase:"Biotransformation and detoxification of drugs",o:["Cytochrome P450 monoxygenases","Biotin","Catalase","Pyridoxal phosphate","Oxidoreductases"],a:0},
  {id:36,s:4,t:"Nucleotides & DNA",type:"match",phrase:"Base + ribose + phosphate",o:["Coenzymes","Purines","Nucleic acids","Reverse transcription","Nucleotide"],a:4},
  {id:37,s:4,t:"Nucleotides & DNA",type:"match",phrase:"RNA and DNA",o:["Coenzymes","Purines","Nucleic acids","Reverse transcription","Nucleotide"],a:2},
  {id:38,s:4,t:"Nucleotides & DNA",type:"match",phrase:"Adenine and guanine",o:["Coenzymes","Purines","Nucleic acids","Reverse transcription","Nucleotide"],a:1},
  {id:39,s:4,t:"Nucleotides & DNA",type:"match",phrase:"Complementary synthesis from mRNA",o:["Coenzymes","Purines","Nucleic acids","Reverse transcription","Nucleotide"],a:3},
  {id:40,s:4,t:"Nucleotides & DNA",type:"match",phrase:"NADH and NADPH",o:["Coenzymes","Purines","Nucleic acids","Reverse transcription","Nucleotide"],a:0},
  {id:41,s:1,t:"Carbohydrate Tests",type:"match",phrase:"Differentiate between reducing and non-reducing sugars",o:["Fehling's test","Seliwanoff's test","Iodine test","Molisch's test","Osazone test"],a:0},
  {id:42,s:1,t:"Carbohydrate Tests",type:"match",phrase:"Characterization and identification of different REDUCING sugars",o:["Fehling's test","Seliwanoff's test","Iodine test","Molisch's test","Osazone test"],a:4},
  {id:43,s:1,t:"Carbohydrate Tests",type:"match",phrase:"Distinguishes keto sugars from aldo sugars",o:["Fehling's test","Seliwanoff's test","Iodine test","Molisch's test","Osazone test"],a:1},
  {id:44,s:1,t:"Carbohydrate Tests",type:"match",phrase:"General test for detection of polysaccharides",o:["Fehling's test","Seliwanoff's test","Iodine test","Molisch's test","Osazone test"],a:2},
  {id:45,s:1,t:"Carbohydrate Tests",type:"match",phrase:"A general test for all carbohydrates",o:["Fehling's test","Seliwanoff's test","Iodine test","Molisch's test","Osazone test"],a:3},
  {id:46,s:1,t:"Carbohydrates",type:"match",phrase:"Alternative name for table sugar",o:["Sucrose","Glucose","Homoglycan","Glycogen","Xylose"],a:0},
  {id:47,s:1,t:"Carbohydrates",type:"match",phrase:"Containing 6 carbon atoms",o:["Sucrose","Glucose","Homoglycan","Glycogen","Xylose"],a:1},
  {id:48,s:1,t:"Carbohydrates",type:"match",phrase:"End product of starch hydrolysis",o:["Sucrose","Glucose","Homoglycan","Glycogen","Xylose"],a:1},
  {id:49,s:1,t:"Carbohydrates",type:"match",phrase:"Analogue of starch",o:["Sucrose","Glucose","Homoglycan","Glycogen","Xylose"],a:3},
  {id:50,s:1,t:"Carbohydrates",type:"match",phrase:"Consisting of one type of monosaccharide subunit",o:["Sucrose","Glucose","Homoglycan","Glycogen","Xylose"],a:2},
  {id:51,s:2,t:"Lipids",type:"match",phrase:"Reduced level causes mitochondrial dysfunction",o:["Prostaglandins","Phrynoderma","Cardiolipin","Dipalmitoyl lecithin","Phosphatidylinositol"],a:2},
  {id:52,s:2,t:"Lipids",type:"match",phrase:"A precursor of second messengers",o:["Prostaglandins","Phrynoderma","Cardiolipin","Dipalmitoyl lecithin","Phosphatidylinositol"],a:4},
  {id:53,s:2,t:"Lipids",type:"match",phrase:"Absence from lungs of premature infants causes respiratory distress syndrome",o:["Prostaglandins","Phrynoderma","Cardiolipin","Dipalmitoyl lecithin","Phosphatidylinositol"],a:3},
  {id:54,s:2,t:"Lipids",type:"match",phrase:"Synthesized from Eicosatetraenoic acid",o:["Prostaglandins","Phrynoderma","Cardiolipin","Dipalmitoyl lecithin","Phosphatidylinositol"],a:0},
  {id:55,s:2,t:"Lipids",type:"match",phrase:"Deficiency of essential fatty acids",o:["Prostaglandins","Phrynoderma","Cardiolipin","Dipalmitoyl lecithin","Phosphatidylinositol"],a:1},
  {id:56,s:2,t:"Cell Membranes",type:"match",phrase:"Cell-cell recognition and adhesion",o:["GPI Anchor","Peripheral proteins","Fluid mosaic model","Membrane Glycoprotein","Transmembrane proteins"],a:3},
  {id:57,s:2,t:"Cell Membranes",type:"match",phrase:"Firmly embedded in the lipid bilayer",o:["GPI Anchor","Peripheral proteins","Fluid mosaic model","Membrane Glycoprotein","Transmembrane proteins"],a:4},
  {id:58,s:2,t:"Cell Membranes",type:"match",phrase:"Peripheral proteins attached through glycosyl bond to membrane lipids",o:["GPI Anchor","Peripheral proteins","Fluid mosaic model","Membrane Glycoprotein","Transmembrane proteins"],a:0},
  {id:59,s:2,t:"Cell Membranes",type:"match",phrase:"Loosely bound to outer or inner leaflet of the lipid bilayer",o:["GPI Anchor","Peripheral proteins","Fluid mosaic model","Membrane Glycoprotein","Transmembrane proteins"],a:1},
  {id:60,s:2,t:"Cell Membranes",type:"match",phrase:"Describes the biological cell membrane structure",o:["GPI Anchor","Peripheral proteins","Fluid mosaic model","Membrane Glycoprotein","Transmembrane proteins"],a:2},
  {id:61,s:5,t:"Diabetes Mellitus",type:"multi",q:"Concerning Diabetes Mellitus (DM) the following are true:",st:["It is an endocrine disease caused by relative or absolute deficiency of insulin","It is characterized by chronic hyperglycemia","Glycosuria may be present","Caused by resistance to insulin action at cellular level"],a:4},
  {id:62,s:5,t:"Diabetes Mellitus",type:"multi",q:"Concerning non-insulin dependent DM, the following are true:",st:["This type is the most common form of the disease","Patients are usually older","Obesity is common at onset","Characterized by an absolute deficiency of insulin"],a:0},
  {id:63,s:5,t:"Diabetes Mellitus",type:"multi",q:"Concerning Insulin dependent DM, the following are true:",st:["This type is less common","Characterized by relative deficiency of insulin","This type is commoner in the young","Patients develop ketosis"],a:1},
  {id:64,s:5,t:"Diabetes Mellitus",type:"multi",q:"The following are biochemical disturbances of diabetes mellitus:",st:["Increase glucose oxidation","Increase gluconeogenesis","Increase glycogenesis","Hyperkalemia"],a:2},
  {id:65,s:5,t:"Carbohydrate Metabolism",type:"multi",q:"Enzymes involved in glycogenesis in the muscles:",st:["Hexokinase","Glucokinase","UDP-Glucose pyrophosphorylase","Glucose-6-phosphatase"],a:1},
  {id:66,s:5,t:"Enzymes",type:"multi",q:"Isoenzymes:",st:["Possess similar catalytic activity","Act on the same substrate","Produce the same product","Originate from the same site"],a:0},
  {id:67,s:5,t:"Enzymes",type:"multi",q:"Competitive Reversible Inhibitors:",st:["Catalyse the removal of groups from compounds","Possess a similar structure to the substrate","Leave double bonds behind at end of reaction","Can be overcome by increasing substrate concentration"],a:2},
  {id:68,s:5,t:"Enzymes",type:"multi",q:"Non-Protein Components of a Holoenzyme:",st:["Coenzyme","Cofactor","Prosthetic Group","Simple Enzyme"],a:0},
  {id:69,s:4,t:"Nucleotides & DNA",type:"multi",q:"The minor purine bases are:",st:["Hypoxanthine","Xanthine","Uric acid","Guanine"],a:0},
  {id:70,s:4,t:"Nucleotides & DNA",type:"multi",q:"The end product of catabolism of purines:",st:["Xanthine","Hypoxanthine","Adenine","Uric acid"],a:3},
  {id:71,s:4,t:"Nucleotides & DNA",type:"multi",q:"These nucleosides are found in tRNA structure:",st:["Ribothymidine","Pseudouridine","Dihydrouridine","Thymidine"],a:0},
  {id:72,s:4,t:"Cell Signaling",type:"multi",q:"Which of these can act as second messengers in hormone action?",st:["NADPH","Cyclic AMP","FADH₂","Cyclic GMP"],a:2},
  {id:73,s:5,t:"Enzymes & Coenzymes",type:"multi",q:"The coenzymes for dehydrogenases include:",st:["NADH","NADPH","FADH","Cyclic AMP"],a:0},
  {id:74,s:3,t:"Amino Acids",type:"multi",q:"Hydroxylic group containing amino acids:",st:["Alanine","Valine","Tryptophan","Threonine"],a:3},
  {id:75,s:3,t:"Amino Acids",type:"multi",q:"Non-essential amino acids:",st:["Alanine","Glycine","Serine","Asparagine"],a:4},
  {id:76,s:3,t:"Amino Acids",type:"multi",q:"An α-amino acid is characterized by the following attached to the central carbon:",st:["Carboxylic acid","Hydrogen","α-carbon","Phosphorus"],a:0},
  {id:77,s:3,t:"Amino Acids",type:"multi",q:"Sulphur test is positive to which of the following?",st:["Selenium","Methionine","Serine","Cysteine"],a:3},
  {id:78,s:5,t:"Enzymes & Coenzymes",type:"multi",q:"Co-enzyme(s) for anaerobic dehydrogenases may be:",st:["FAD","H₂O","FMN","H₂O₂"],a:1},
  {id:79,s:3,t:"Amino Acids",type:"multi",q:"Which of the following possess chiral property?",st:["Threonine","Isoleucine","Glutamine","Valine"],a:4},
  {id:80,s:5,t:"Coenzymes & Vitamins",type:"multi",q:"Coenzyme A biosynthesis requires:",st:["Cysteine","Pantothenate (vitamin B5)","Adenosine triphosphate (ATP)","Nicotinamide"],a:0},
  {id:81,s:4,t:"Molecular Biology",type:"multi",q:"Histone families include:",st:["HB5","H2A","H3B","H4"],a:2},
  {id:82,s:4,t:"Molecular Biology",type:"multi",q:"Nuclease plays a critical role in the following:",st:["Molecular cloning","DNA repair","Degradation","Recombination"],a:4},
  {id:83,s:4,t:"Molecular Biology",type:"multi",q:"The following is true about DNA denaturation:",st:["Occurs at 40°C","Can be monitored using spectrophotometer","Higher G-C content reduces denaturation time","Brought about by increase in temperature"],a:2},
  {id:84,s:2,t:"Lipids",type:"multi",q:"Fatty acids can be classified based on:",st:["Length of carbon chain","Number of double bonds","Number of carbon atoms","Number of carboxylic groups"],a:0},
  {id:85,s:2,t:"Lipids",type:"multi",q:"General functions of lipids include:",st:["Efficient energy sources","Serve as thermal insulators","Structural components of the cell membrane","Precursors for steroid hormones"],a:4},
  {id:86,s:2,t:"Lipids",type:"multi",q:"The unsaturated fatty acid is differentiated from saturated by:",st:["Number of carbon atoms","Presence of a carboxylic group","Length of carbon chain","Presence of double bonds"],a:3},
  {id:87,s:2,t:"Lipids",type:"multi",q:"Polyunsaturated fatty acids include:",st:["Palmitoleic acid","Arachidonic acid","Oleic acid","Linolenic acid"],a:2},
  {id:88,s:2,t:"Lipids",type:"multi",q:"Concerning unsaturated fatty acids the following are correct:",st:["Named by adding suffix 'enoic'","Have carboxylic group at the end","May have more than three double bonds","PUFAs are precursors for thromboxanes"],a:4},
  {id:89,s:2,t:"Cell Membranes",type:"multi",q:"Membrane lipids include:",st:["Phospholipids","Glycolipids","Cholesterol","Steroids"],a:0},
  {id:90,s:2,t:"Cell Membranes",type:"multi",q:"Functions of membrane proteins:",st:["Mediators of transmembrane movement","Receptors for hormones and growth factors","Enzymes for signal transduction","Molecular pumps"],a:4},
  {id:91,s:5,t:"Carbohydrate Metabolism",type:"ar",assert:"Glycogenolysis ends up as lactate in the muscles",reason:"Because glucose-6-phosphatase is present in muscles.",a:2},
  {id:92,s:1,t:"Carbohydrates",type:"ar",assert:"All monosaccharides are reducing sugars",reason:"Because their anomeric carbon has an OH group that can reduce other compounds.",a:0},
  {id:93,s:1,t:"Carbohydrates",type:"ar",assert:"All disaccharides form characteristic osazone crystals",reason:"Because they have free carbonyl groups which react with phenylhydrazine.",a:4},
  {id:94,s:5,t:"Enzymes",type:"ar",assert:"Enzymes are catalysts for chemical reactions in biological systems",reason:"Because they are protein in nature.",a:1},
  {id:95,s:5,t:"Enzymes",type:"ar",assert:"Temperature is a factor that affects enzyme activity",reason:"Because it lowers the activation energy of a reaction.",a:2},
  {id:96,s:5,t:"Enzymes",type:"ar",assert:"Vmax is an indicator of the saturation effect",reason:"Because half of the active sites of all enzymes are occupied at maximum velocity.",a:2},
  {id:97,s:4,t:"Molecular Biology",type:"ar",assert:"DNA has a net negative charge",reason:"Because its phosphate groups are negatively charged.",a:0},
  {id:98,s:5,t:"Coenzymes & Vitamins",type:"ar",assert:"NADH is a coenzyme",reason:"Because all nucleotides are coenzymes.",a:2},
  {id:99,s:4,t:"Molecular Biology",type:"ar",assert:"DNA is an enzyme",reason:"Because all nucleic acids are enzymes.",a:4},
  {id:100,s:5,t:"Bioenergetics",type:"ar",assert:"ATP is the universal energy currency",reason:"Because all nucleotides are high energy compounds.",a:2},
  {id:101,s:5,t:"Bioenergetics",type:"ar",assert:"ΔG provides information about the spontaneity but not the rate of reaction",reason:"Because an input of free energy is required to drive an endergonic reaction.",a:1},
  {id:102,s:5,t:"Enzymes",type:"ar",assert:"Cytochrome P450 is a monoxygenase",reason:"Because it is involved in the biotransformation and detoxification of drugs.",a:1},
  {id:103,s:5,t:"Enzymes",type:"ar",assert:"Oxidases are also called anaerobic dehydrogenases",reason:"Because they use oxygen as a hydrogen acceptor.",a:3},
  {id:104,s:3,t:"Amino Acids",type:"ar",assert:"Amino acids are amphoteric molecules",reason:"Because they are monomers of proteins.",a:1},
  {id:105,s:3,t:"Amino Acids",type:"ar",assert:"Isoleucine, leucine and valine are branched-chain amino acids",reason:"Because their carbon skeletons cannot be synthesized by humans.",a:1},
  {id:106,s:3,t:"Amino Acids",type:"ar",assert:"Arginine and histidine are termed 'semi-essential' amino acids",reason:"Because they are both basic amino acids.",a:1},
  {id:107,s:4,t:"Molecular Biology",type:"ar",assert:"Base pairing in DNA is termed complementary",reason:"Because a purine must pair with either a purine or pyrimidine.",a:2},
  {id:108,s:4,t:"Molecular Biology",type:"ar",assert:"G+C content can be used to estimate DNA density",reason:"Because A+T base pairs are less dense than G+C counterpart.",a:0},
  {id:109,s:2,t:"Cell Membranes",type:"ar",assert:"The membrane is a lipid bilayer",reason:"Because it is made up of a bilayer of predominantly phospholipids.",a:0},
  {id:110,s:2,t:"Lipids",type:"ar",assert:"Linoleic and linolenic acids are essential fatty acids",reason:"Because they are essential in humans.",a:0},
  {id:111,s:2,t:"Cell Membranes",type:"ar",assert:"The plasma membrane and membranes lining the organelles do not vary",reason:"Because they have essential features in common.",a:3},
  {id:112,s:2,t:"Lipids",type:"ar",assert:"Complex lipids are also known as compound lipids",reason:"Because they contain fatty acids as well as glycerol.",a:2},
  {id:113,s:2,t:"Lipids",type:"ar",assert:"Arachidonic acid is said to be semi-essential",reason:"Because it can be synthesized from linoleic acid.",a:0},
  {id:114,s:1,t:"Carbohydrates",type:"ar",assert:"GAGs are responsible for the slippery consistency of mucus secretions",reason:"Because its homoglycan chains attract & stick together in contorted conformations in solutions.",a:2},
  {id:115,s:4,t:"Molecular Biology",type:"ar",assert:"DNA easily associates with histone proteins",reason:"Because histones are negatively charged.",a:2},
  {id:116,s:4,t:"Molecular Biology",type:"ar",assert:"RNA is more stable than DNA",reason:"Because the hydroxyl group on the 2' carbon of ribose is more reactive than the hydrogen in deoxyribose.",a:3},
  {id:117,s:3,t:"Amino Acids",type:"ar",assert:"Glycine has chiral property",reason:"Because its side chain contains a sulphur atom.",a:4},
  {id:118,s:3,t:"Amino Acids",type:"ar",assert:"Some amino acids show positive Xanthoproteic test",reason:"Because they contain an aromatic nucleus.",a:0},
  {id:119,s:5,t:"Enzymes",type:"ar",assert:"Most enzyme-catalyzed reactions are highly efficient",reason:"Because they proceed 10³ to 10⁸ times faster than uncatalyzed reactions.",a:0},
  {id:120,s:2,t:"Lipids",type:"ar",assert:"Lipids are involved in digestion of vitamins",reason:"Because all vitamins are fat soluble.",a:2},
  // ── EXAM 2 ─────────────────────────────────────────────────────────────────
  {id:201,s:1,t:"Carbohydrates",type:"mcq",q:"Carbohydrates are best defined as:",o:["Polyhydroxy aldehydes and ketones","Polyhydroxy aldehydes","Polyhydroxy ketones","Polyhydroxy aldehydes, ketones and their derivatives","Derivatives of carbon, hydrogen and oxygen"],a:3},
  {id:202,s:1,t:"Carbohydrates",type:"mcq",q:"Regarding the functions of carbohydrates, which of these is incorrect?",o:["Source of dietary fibre","Energy provision","Genetic information storage","Cell to Cell communication","Cell structural material"],a:2},
  {id:203,s:1,t:"Carbohydrate Classification",type:"mcq",q:"The pentose sugar among the following is:",o:["Glyceraldehyde","Xylulose","Sedoheptulose","Fructose","Erythrose"],a:1},
  {id:204,s:1,t:"Carbohydrate Classification",type:"mcq",q:"Which of the following is a keto sugar?",o:["Ribose","Xylose","Fructose","Glucose","Erythrose"],a:2},
  {id:205,s:1,t:"Oligosaccharides",type:"mcq",q:"One of the following is a tetrasaccharide:",o:["Arabinose","Stachyose","Kalinose","Gentiobiose","Trehalose"],a:1},
  {id:206,s:1,t:"Stereochemistry",type:"mcq",q:"The reference compound used to determine the D- and L-forms of monosaccharides is:",o:["Dihydroxyacetone","Fructose","Galactose","Glucose","Glyceraldehyde"],a:4},
  {id:207,s:1,t:"Oligosaccharides",type:"mcq",q:"What are the monosaccharides that compose Raffinose?",o:["Galactose, glucose and fructose","Glucose, fructose and mannose","Mannose, galactose and glucose","Arabinose, glucose and fructose","Galactose, fructose and Ribulose"],a:0},
  {id:208,s:1,t:"Oligosaccharides",type:"mcq",q:"Gentiobiose is a disaccharide made up of:",o:["Glucose and mannose","Glucose and galactose","Glucose and glucose","Fructose and fructose","Galactose and galactose"],a:2},
  {id:209,s:1,t:"Polysaccharides",type:"mcq",q:"The following are homopolysaccharides EXCEPT:",o:["Dextran","Starch","Glycogen","Chitin","Heparin"],a:4},
  {id:210,s:1,t:"Polysaccharides",type:"mcq",q:"The following are branched polysaccharides EXCEPT:",o:["Amylopectin","Glycogen","Pectin","Mannan","Dextran"],a:2},
  {id:211,s:1,t:"Stereochemistry",type:"mcq",q:"Fructose has how many asymmetric carbon atoms?",o:["2","3","4","5","6"],a:1},
  {id:212,s:1,t:"Stereochemistry",type:"mcq",q:"Enantiomeric pairs have these properties EXCEPT:",o:["Opposite configurations at all chiral centers","Different solubilities in various solvents","Exhibit optical activity","Same boiling points","Same melting points"],a:1},
  {id:213,s:1,t:"Stereochemistry",type:"mcq",q:"Regarding diastereomers, they differ in:",o:["Melting/boiling points","Specific rotation","Solubility","Chemical properties","All of the above"],a:4},
  {id:214,s:1,t:"Stereochemistry",type:"mcq",q:"As epimers, Glucose and galactose differ in configuration at carbon atom number:",o:["2","3","4","5","6"],a:2},
  {id:215,s:1,t:"Carbohydrate Chemistry",type:"mcq",q:"The open chain forms of sugars cyclize into rings because:",o:["The ring forms are energetically more stable","The ring forms resemble pyran rings","The ring forms resemble furan rings","They form oxygen bridges","They form hemiacetal"],a:0},
  {id:216,s:1,t:"Carbohydrate Chemistry",type:"mcq",q:"During cyclization of glucose, the C-1 aldehyde group reacts with the -OH on carbon number:",o:["6","5","4","3","2"],a:1},
  {id:217,s:1,t:"Carbohydrate Chemistry",type:"mcq",q:"The asymmetric carbon in the ring structure of monosaccharides is referred to as:",o:["Hemiacetal carbon","Hemiketal carbon","Double cyclic carbon","Anomeric carbon","Epimeric carbon"],a:3},
  {id:218,s:1,t:"Carbohydrate Tests",type:"mcq",q:"Regarding reducing sugars:",o:["They can reduce hydrogen peroxide","They can reduce Cu and Ag ions","They give positive tests with Tollen's reagent","They can reduce ferricyanide","All of the above"],a:4},
  {id:219,s:1,t:"Carbohydrate Chemistry",type:"mcq",q:"The following can undergo MUTAROTATION EXCEPT:",o:["Gentiobiose","Cellobiose","Lactose","Maltose","Trehalose"],a:4},
  {id:220,s:1,t:"Polysaccharides",type:"mcq",q:"Polysaccharides are essentially non-reducing because:",o:["Carbonyl groups of most monosaccharides are not involved in glycosidic bonds","They contain many monosaccharides","Only one monosaccharide has a free carbonyl group","Most monosaccharides are non-reducing","Most glycosidic bonds are weak"],a:2},
  {id:221,s:1,t:"Carbohydrate Tests",type:"mcq",q:"Reducing sugars include all EXCEPT:",o:["Sucrose","Maltose","Lactose","Glucose","Fructose"],a:0},
  {id:222,s:1,t:"Carbohydrates",type:"mcq",q:"The carbohydrate of the blood group substances is:",o:["Sucrose","Fucose","Arabinose","Maltose","Fructose"],a:1},
  {id:223,s:1,t:"Carbohydrates",type:"mcq",q:"Ribose is commonly involved in the formation of:",o:["Glycoproteins","Glycolipids","DNA","RNA","Biosynthetic pathways"],a:3},
  {id:224,s:1,t:"Carbohydrate Chemistry",type:"mcq",q:"The oxidation of glucose at C-1 and C-6 yields:",o:["Glucaric Acid","Gluconic acid","Glucuronic acid","Glucitol","Aldonic acid"],a:0},
  {id:225,s:1,t:"Carbohydrate Tests",type:"mcq",q:"One of the following will NOT give a positive osazone test:",o:["Glucose","Maltose","Sucrose","Lactose","Fructose"],a:2},
  {id:226,s:1,t:"Carbohydrate Tests",type:"mcq",q:"Which of the following will give a negative iodine test?",o:["Sucrose","Glycogen","Amylopectin","Cellulose","Chitin"],a:0},
  {id:227,s:1,t:"Carbohydrate Tests",type:"mcq",q:"A positive Seliwanoff test is obtained with:",o:["Galactose","Fructose","Glucose","Lactose","Maltose"],a:1},
  {id:228,s:1,t:"Polysaccharides",type:"mcq",q:"Which of the following is a polymer of fructose?",o:["Amylose","Inulin","Cellulose","Dextrins","Glycogen"],a:1},
  {id:229,s:2,t:"Sterols & Cholesterol",type:"mcq",q:"Which of the following is incorrect about cholesterol structure?",o:["Is an important part of the cell membrane","Contains one hydroxyl group","Contains 29 carbon atoms","Has a central sterol nucleus of four hydrocarbon rings","Belongs to the steroid family"],a:2},
  {id:230,s:2,t:"Lipid Classification",type:"mcq",q:"The following are derived lipids EXCEPT:",o:["Triacylglycerol","Eicosanoids","Glycerol and sterols","Fatty aldehydes","Ketone bodies"],a:0},
  {id:231,s:2,t:"Phospholipids",type:"mcq",q:"One of the following is NOT a glycerophospholipid:",o:["Lecithin","Cardiolipin","Cephalin","Sphingomyelin","Phosphatidyl serine"],a:3},
  {id:232,s:2,t:"Fatty Acids",type:"mcq",q:"The fatty acid CH₃(CH₂)₄CH=CHCH₂CH=CH(CH₂)₇COOH is:",o:["Arachidonic acid","Linoleic acid","Linolenic acid","Oleic acid","None of the above"],a:1},
  {id:233,s:2,t:"Fatty Acids",type:"mcq",q:"One of the following is an essential fatty acid:",o:["Oleic acid","Linoleic acid","Palmitoleic acid","Arachidic acid","Palmitic acid"],a:1},
  {id:234,s:2,t:"Eicosanoids",type:"mcq",q:"Physiologically important compounds derived from Arachidonic acid include:",o:["Prostaglandins","Leukotrienes","Thromboxanes","A, B and C","B and C only"],a:3},
  {id:235,s:2,t:"Glycolipids",type:"mcq",q:"Which glycolipid contains sialic acid (N-acetylneuraminic acid) bound to ceramide?",o:["Globoside","Ganglioside","Cerebroside","Sulphatides","None of the above"],a:1},
  {id:236,s:2,t:"Lipid Chemistry",type:"mcq",q:"Alkaline hydrolysis of a fat is referred to as:",o:["Saponification","Esterification","Polymerisation","Saturation","Lipolysis"],a:0},
  {id:237,s:2,t:"Lipid Classification",type:"mcq",q:"The most important storage and metabolically important class of lipids is:",o:["Phospholipids","Glycolipids","Sphingolipids","Triacylglycerol","Sphingomyelin"],a:3},
  {id:238,s:2,t:"Fatty Acids",type:"mcq",q:"An omega-3 fatty acid among the following is:",o:["Palmitoleic acid","Oleic acid","Linoleic acid","Linolenic acid","Arachidonic acid"],a:3},
  {id:239,s:2,t:"Fatty Acids",type:"mcq",q:"One of the following is a saturated C16 fatty acid:",o:["Caprylic acid","Capric acid","Lauric acid","Myristic acid","Palmitic acid"],a:4},
  {id:240,s:2,t:"Cell Membranes",type:"mcq",q:"The cell membrane is a:",o:["Protein bilayer","A carbohydrate bilayer","A and B","Lipid bilayer","None of the above"],a:3},
  {id:241,s:2,t:"Cell Membranes",type:"mcq",q:"Concerning membrane proteins, they can be all of these EXCEPT:",o:["Mainly symmetric","Are mainly glycoproteins","Can be peripheral","Can be integral","Are mainly asymmetrically embedded"],a:0},
  {id:242,s:2,t:"Glycosaminoglycans",type:"mcq",q:"One of the following does not have sulfuric acid groups:",o:["Heparin","Hyaluronic acid","Chondroitin sulfate","Keratan sulfate","None of the above"],a:1},
  {id:243,s:2,t:"Lipid Classification",type:"mcq",q:"Which of these is NOT a lipid?",o:["Fats","Oils","Waxes","Peptides","Triglycerol"],a:3},
  {id:244,s:2,t:"Fatty Acids",type:"mcq",q:"Fatty acids can be classified based on the following EXCEPT:",o:["Length of carbon chain","Number of double bonds","Number of carbon atoms","Number of the carboxylic groups","Nature of hydrocarbon chain"],a:3},
  {id:245,s:2,t:"Phospholipids",type:"mcq",q:"Examples of phospholipids with glycerol backbone include the following EXCEPT:",o:["Phosphatidylcholine","Sphingophospholipids","Cephalin","Phosphatidylinositol","Cardiolipin"],a:1},
  {id:246,s:2,t:"Sterols & Cholesterol",type:"mcq",q:"Cholesterol structure has an -OH group at carbon position:",o:["C-3","C-5","C-7","C-17","C-21"],a:0},
  {id:247,s:2,t:"Sterols & Cholesterol",type:"mcq",q:"Cholesterol structure has an unsaturated double bond between:",o:["C-4 and C-5","C-5 and C-6","C-6 and C-7","C-7 and C-8","C-8 and C-9"],a:1},
  {id:248,s:5,t:"Acid-Base Chemistry",type:"mcq",q:"In the Brønsted-Lowry system, a base is defined as:",o:["A proton donor","A hydroxide donor","An electron pair acceptor","A water-former","A proton acceptor"],a:4},
  {id:249,s:5,t:"Acid-Base Chemistry",type:"mcq",q:"Arrhenius defined an acid as:",o:["A species that can donate a proton","A species that can accept a proton","A source of OH⁻ ions in water","A source of H⁺ ions in water","A species that can accept a pair of electrons"],a:3},
  {id:250,s:5,t:"Acid-Base Chemistry",type:"mcq",q:"In the presence of an acid, an amino group can be:",o:["Polarized","Washed away","Protonated","Replaced","Deprotonated"],a:2},
  {id:251,s:5,t:"Buffer Systems",type:"mcq",q:"Buffers react with ions of:",o:["Nitrogen","Magnesium","Hydrogen","Sodium","Phosphorus"],a:2},
  {id:252,s:5,t:"Buffer Systems",type:"mcq",q:"Carbonic acid and bicarbonate ions buffer which of the following?",o:["Cytosol","Cytoplasm","Blood","Lymph","Urine"],a:2},
  {id:253,s:3,t:"Amino Acids",type:"mcq",q:"Which group makes an amino acid unique?",o:["Carboxyl group","Amino group","'R' group","Hydrogen","The alpha carbon"],a:2},
  {id:254,s:3,t:"Amino Acids",type:"mcq",q:"The structural formulas of amino acids are the same EXCEPT for the:",o:["Carboxyl group","Alpha carbon","Amine group","Side (R) group","Hydrogen bonding"],a:3},
  {id:255,s:3,t:"Amino Acids",type:"mcq",q:"Amino acids with the aliphatic 'R' group are:",o:["Serine, threonine, cysteine","Lysine, arginine, histidine","Glycine, valine, alanine","Phenylalanine, tyrosine, tryptophan","None of the above"],a:2},
  {id:256,s:3,t:"Essential Amino Acids",type:"mcq",q:"The following amino acids are necessary to be taken in the diet EXCEPT?",o:["Threonine","Methionine","Valine","Glycine","Lysine"],a:3},
  {id:257,s:3,t:"Amino Acids",type:"mcq",q:"Amino acids with aromatic ring side chains include:",o:["Phenylalanine, tryptophan, serine","Asparagine, tryptophan, tyrosine","Histidine, proline, tyrosine","Phenylalanine, tryptophan, tyrosine","Tryptophan, threonine, tyrosine"],a:3},
  {id:258,s:3,t:"Amino Acid Metabolism",type:"mcq",q:"Which of the following amino acids is both glucogenic as well as ketogenic?",o:["Isoleucine","Leucine","Arginine","Asparagine","Valine"],a:0},
  {id:259,s:3,t:"Amino Acids",type:"mcq",q:"All are non-polar amino acids EXCEPT?",o:["Alanine","Valine","Leucine","Serine","Tryptophan"],a:3},
  {id:260,s:3,t:"Amino Acids",type:"mcq",q:"Which of the following amino acids is optically inactive?",o:["Leucine","Isoleucine","Methionine","Glycine","Tryptophan"],a:3},
  {id:261,s:3,t:"Amino Acid Metabolism",type:"mcq",q:"One of the following amino acids is strictly glucogenic:",o:["Phenylalanine","Isoleucine","Leucine","Valine","Tryptophan"],a:3},
  {id:262,s:3,t:"Amino Acids",type:"mcq",q:"Which of the following contains a thiol group important for protein stability?",o:["Leucine","Tryptophan","Valine","Cysteine","Proline"],a:3},
  {id:263,s:3,t:"Amino Acids",type:"mcq",q:"One of the following is a branched chain amino acid:",o:["Cysteine","Valine","Tyrosine","Alanine","Methionine"],a:1},
  {id:264,s:3,t:"Amino Acids",type:"mcq",q:"Which of the following is an Imino acid?",o:["Glutamic acid","Aspartic acid","Proline","Threonine","Leucine"],a:2},
  {id:265,s:3,t:"Amino Acids",type:"mcq",q:"Which of the following amino acids is dicarboxylic?",o:["Aspartate","Cysteine","Glycine","Valine","Isoleucine"],a:0},
  {id:266,s:3,t:"Amino Acids",type:"mcq",q:"All of the following are sulfur-containing amino acids EXCEPT?",o:["Cysteine","Cystine","Threonine","Methionine","Homocysteine"],a:2},
  {id:267,s:3,t:"Amino Acids",type:"mcq",q:"Amino acids are ampholytes because they can function as either a(an):",o:["Neutral molecule or an ion","Polar or a non-polar molecule","Acid or base","Standard or non-standard monomer","Transparent or light absorbing compound"],a:2},
  {id:268,s:3,t:"Protein Structure",type:"mcq",q:"In protein structure, the alpha-helix and beta-pleated sheet are examples of:",o:["Primary structure","Secondary structure","Tertiary structure","Quaternary structure","Subunit structure"],a:1},
  {id:269,s:3,t:"Protein Structure",type:"mcq",q:"Peptide bond formation is a/an?",o:["Amidation reaction","Hydrolysis reaction","Ionisation reaction","Condensation reaction","Carboxylation reaction"],a:3},
  {id:270,s:3,t:"Protein Structure",type:"mcq",q:"The beginning of a polypeptide chain contains a free group known as:",o:["N-Terminal","C-Terminal","R-Terminal","Alpha-Terminal","H-Terminal"],a:0},
  {id:271,s:3,t:"Protein Structure",type:"mcq",q:"The spatial structural arrangement of a single complete polypeptide unit into a 3D fold is its:",o:["Primary structure","Secondary structure","Tertiary structure","Quaternary structure","Subunit structure"],a:2},
  {id:272,s:3,t:"Protein Classification",type:"mcq",q:"Which of the following is an example of a fibrous protein?",o:["Hemoglobin","Globulin","Collagen","Trypsin","Myoglobin"],a:2},
  {id:273,s:4,t:"Nucleotides & DNA",type:"mcq",q:"When a nitrogenous base combines with a pentose sugar, a _____ is formed.",o:["Purine","Nucleotide","Pyrimidine","Nucleic acid","Nucleoside"],a:4},
  {id:274,s:4,t:"Nucleotides & DNA",type:"mcq",q:"The loss of helical structure of DNA as a result of pH change or temperature increase is known as:",o:["Polarity","Hyperchromicity","Renaturation","Denaturation","None of the above"],a:3},
  {id:275,s:4,t:"Nucleotides & DNA",type:"mcq",q:"The following are properties of nucleotides EXCEPT:",o:["They are weakly basic compounds","They are weakly acidic compounds","They may exist in two or more tautomeric forms","They absorb UV light at ~260 nm","They are hydrophobic and insoluble in water"],a:0},
  {id:276,s:4,t:"Nucleotide Analogues",type:"mcq",q:"Purine/pyrimidine analog used to suppress organ rejection during transplantation is:",o:["Allopurinol","Fluorouracil","6-mercaptopurine","Thioguanine","Azathioprine"],a:4},
  {id:277,s:4,t:"Nucleotides & DNA",type:"mcq",q:"The following are functions of cAMP EXCEPT:",o:["Acts as 'Second messenger' to the cell","Regulates glycogen metabolism","Regulates triglycerides metabolism","Modulates transcription and translation","Direct phosphorylation of proteins"],a:4},
  {id:278,s:4,t:"Nucleotides & DNA",type:"mcq",q:"A nucleoside triphosphate molecule contains how many high-energy phosphoanhydride bonds?",o:["One high energy bond","Two high energy bonds","Three high energy bonds","Four high energy bonds","No high energy bond"],a:1},
  {id:279,s:4,t:"Nucleotides & DNA",type:"mcq",q:"The atoms in the purine ring are numbered in which spatial direction?",o:["Clockwise","Counter-clockwise","Randomly","Variable based on context","Top to bottom"],a:1},
  {id:280,s:4,t:"Nucleotides & DNA",type:"mcq",q:"Ribose and deoxyribose sugars differ structurally at which carbon position?",o:["C-1","C-2","C-3","C-4","C-5"],a:1},
  {id:281,s:4,t:"Nucleotides & DNA",type:"mcq",q:"Which of these is a true biochemical property of uracil?",o:["Does not exhibit tautomerism","Found in both DNA and RNA","Found only in DNA","It is 2,4-dioxypyrimidine","None of the above"],a:3},
  {id:282,s:4,t:"Nucleotides & DNA",type:"mcq",q:"The following mononucleotides can be found inside a normal DNA molecule EXCEPT:",o:["TMP","dCMP","dAMP","dUMP","dGMP"],a:3},
  {id:283,s:4,t:"Nucleotides & DNA",type:"mcq",q:"The sedimentation velocity of a given RNA species during centrifugation is dependent on its:",o:["Density and size","Shape and solubility","Weight and pH","Density and shape","None of the above"],a:3},
  {id:284,s:4,t:"Molecular Biology",type:"mcq",q:"Which of the following statements is true regarding DNA gel electrophoresis?",o:["Smaller pieces migrate faster","DNA migrates towards the positive electrode","Agarose separates larger molecules of DNA","Polyacrylamide separates small pieces of DNA","All of the above"],a:4},
  {id:285,s:4,t:"Nucleotides & DNA",type:"mcq",q:"Which of these enzymes cleaves terminal single nucleotides from a nucleic acid chain?",o:["Endonucleases","Catalase","Exonucleases","Ligase","Restriction endonucleases"],a:2},
  {id:286,s:4,t:"Nucleotides & DNA",type:"mcq",q:"Which base pairing in DNA is correct with reference to base identity and hydrogen bonds?",o:["G-C (three hydrogen bonds)","G-T (two hydrogen bonds)","A-T (three hydrogen bonds)","U-G (two hydrogen bonds)","A-C (one hydrogen bond)"],a:0},
  {id:287,s:4,t:"Nucleotides & DNA",type:"mcq",q:"Name the purine bases commonly found in both DNA and RNA:",o:["Adenine and cytosine","Cytosine and thymine","Adenine and thymine","Uridine and guanine","Adenine and guanine"],a:4},
  {id:288,s:4,t:"Chromatin & Histones",type:"mcq",q:"Which of the following is the primary physiological function of histones in eukaryotic cells?",o:["DNA replication","Protein synthesis","DNA packaging","RNA transcription","Cellular respiration"],a:2},
  {id:289,s:4,t:"Chromatin & Histones",type:"mcq",q:"Which histone tail modification is strongly associated with gene transcriptional repression?",o:["Acetylation","Methylation (H3K9me3)","Phosphorylation","Ubiquitination","ADP ribosylation"],a:1},
  {id:290,s:4,t:"Chromatin & Histones",type:"mcq",q:"Which of the following accurately describes a chromatid?",o:["The central region of a chromosome","One half of a duplicated chromosome","The end portion of a chromosome","A gene rich region of a chromosome","A protein associated with chromosome structure"],a:1},
  {id:291,s:4,t:"Nucleotides & DNA",type:"mcq",q:"Which of the following is true about the melting temperature (Tm) of DNA?",o:["It increases with a higher GC content","It decreases with a higher GC content","It is independent of the nucleotide sequence","It is the temperature at which DNA condenses","It refers to the temperature at which RNA melts"],a:0},
  {id:292,s:4,t:"Molecular Biology",type:"mcq",q:"What is the natural physiological function of restriction enzymes inside host bacteria?",o:["DNA replication","Protecting bacteria from viral DNA invasion","Synthesizing mRNA","Repairing DNA damage","Facilitating bacterial conjugation"],a:1},
  // ── CARBS 1 ────────────────────────────────────────────────────────────────
  {id:301,s:1,t:"Carbohydrate Classification",type:"mcq",q:"A carbohydrate is defined as a polyhydroxy aldehyde, ketone, or one of their derivatives. Which of the following sugars is classified as a ketose?",o:["Glucose","Galactose","Fructose","Mannose"],a:2},
  {id:302,s:1,t:"Polysaccharides",type:"mcq",q:"Both glycogen and amylopectin contain α(1→4) and α(1→6) glycosidic bonds. Which feature best distinguishes glycogen from amylopectin?",o:["Glycogen contains fructose units","Glycogen is less branched","Glycogen is more highly branched","Glycogen contains β(1→4) bonds"],a:2},
  {id:303,s:1,t:"Oligosaccharides",type:"mcq",q:"A student hydrolyzes a disaccharide and obtains glucose and fructose. The original sugar was most likely:",o:["Lactose","Maltose","Sucrose","Cellobiose"],a:2},
  {id:304,s:1,t:"Polysaccharides",type:"mcq",q:"Cellulose and amylose are both polymers of glucose. Why can humans digest amylose but not cellulose?",o:["Cellulose contains fructose units","Amylose is branched while cellulose is not","Cellulose contains β(1→4) bonds that humans cannot hydrolyze","Amylose contains ketose sugars"],a:2},
  {id:305,s:1,t:"Carbohydrate Tests",type:"mcq",q:"Which of the following carbohydrates is a reducing sugar?",o:["Sucrose","Maltose","Neither sucrose nor maltose","Both are non-reducing sugars"],a:1},
  {id:306,s:1,t:"Polysaccharides",type:"mcq",q:"Which statement correctly explains why starch serves as an energy reserve in plants?",o:["It contains β(1→4) linkages only","It is highly resistant to hydrolysis","It is composed of glucose units that can be mobilized when needed","It is a heteropolysaccharide"],a:2},
  {id:307,s:1,t:"Carbohydrate Tests",type:"mcq",q:"A polysaccharide gives a blue color with iodine solution. Which polysaccharide is most likely present?",o:["Glycogen","Amylose","Cellulose","Chitin"],a:1},
  {id:308,s:1,t:"Carbohydrate Classification",type:"mcq",q:"Which pair consists entirely of pentoses?",o:["Ribose and deoxyribose","Ribose and glucose","Xylose and fructose","Ribulose and galactose"],a:0},
  {id:309,s:1,t:"Oligosaccharides",type:"mcq",q:"Raffinose and stachyose often cause flatulence after consumption because:",o:["They are toxic to intestinal cells","Humans lack the enzymes needed for their digestion","They inhibit carbohydrate absorption","They are rapidly fermented in the stomach"],a:1},
  {id:310,s:1,t:"Polysaccharides",type:"mcq",q:"A carbohydrate contains more than 10 monosaccharide units and is composed entirely of glucose molecules. It is best classified as a:",o:["Monosaccharide","Disaccharide","Oligosaccharide","Homopolysaccharide"],a:3},
  // ── CARBS 2 ────────────────────────────────────────────────────────────────
  {id:311,s:1,t:"Reducing Sugars",type:"mcq",q:"Which of the following properties is essential for a sugar to be classified as a reducing sugar?",o:["Presence of a glycosidic bond","Presence of a free anomeric carbon with an –OH group","Presence of more than one monosaccharide unit","Presence of only aldehyde groups"],a:1},
  {id:312,s:1,t:"Reducing Sugars",type:"mcq",q:"Which of the following carbohydrates is non-reducing?",o:["Glucose","Fructose","Maltose","Sucrose"],a:3},
  {id:313,s:1,t:"Carbohydrate Tests",type:"mcq",q:"A student performs Benedict's test on four sugar solutions. Which sugar is most likely to give a negative result?",o:["Galactose","Fructose","Lactose","Sucrose"],a:3},
  {id:314,s:1,t:"Reducing Sugars",type:"mcq",q:"Why are all monosaccharides classified as reducing sugars?",o:["They all contain glycosidic bonds","They all possess a free carbonyl group or can form one","They contain only aldehyde groups","They are all ketoses"],a:1},
  {id:315,s:1,t:"Carbohydrate Tests",type:"mcq",q:"During Molisch's test, the appearance of a purple ring indicates:",o:["Presence of reducing sugars only","Presence of ketoses only","Presence of carbohydrates","Presence of polysaccharides only"],a:2},
  {id:316,s:1,t:"Carbohydrate Chemistry",type:"mcq",q:"In mild alkaline conditions, glucose can be converted into both fructose and mannose through formation of a common intermediate called:",o:["Glucosazone","Furfural","Enediol","Glucuronic acid"],a:2},
  {id:317,s:1,t:"Carbohydrate Tests",type:"mcq",q:"Which test is specifically used to distinguish ketoses from aldoses?",o:["Benedict's test","Fehling's test","Iodine test","Seliwanoff's test"],a:3},
  {id:318,s:1,t:"Carbohydrate Tests",type:"mcq",q:"A carbohydrate sample gives a blue-black colour when treated with iodine solution. The sample most likely contains:",o:["Glucose","Sucrose","Starch","Lactose"],a:2},
  {id:319,s:1,t:"Carbohydrate Tests",type:"mcq",q:"Glucose, fructose, and mannose produce identical osazone crystals because:",o:["They are all ketoses","They are all aldoses","Carbons 1 and 2 are involved in osazone formation","They contain identical glycosidic bonds"],a:2},
  {id:320,s:1,t:"Carbohydrate Tests",type:"mcq",q:"Which statement correctly compares Benedict's and Fehling's tests?",o:["Both detect polysaccharides specifically","Both depend on the reduction of Cu²⁺ ions by reducing sugars","Benedict's test detects ketoses only","Fehling's test detects non-reducing sugars only"],a:1},
  // ── AMINO ACIDS ────────────────────────────────────────────────────────────
  {id:321,s:3,t:"Amino Acids",type:"mcq",q:"Which property makes glycine unique among the 20 common amino acids?",o:["It contains sulfur","It is aromatic","It is not chiral","It is acidic"],a:2},
  {id:322,s:3,t:"Amino Acids",type:"mcq",q:"Which amino acid is unique because it lacks a free α-amino group?",o:["Glycine","Proline","Histidine","Lysine"],a:1},
  {id:323,s:3,t:"Amino Acid Chemistry",type:"mcq",q:"At the isoelectric point (pI), an amino acid:",o:["Has a positive charge","Has a negative charge","Has no net charge","Cannot exist in solution"],a:2},
  {id:324,s:3,t:"Amino Acid Chemistry",type:"mcq",q:"Amino acids are described as amphoteric because they:",o:["Can absorb UV light","Possess both acidic and basic groups","Are soluble in alcohol","Form peptide bonds"],a:1},
  {id:325,s:3,t:"Amino Acids",type:"mcq",q:"Which amino acid forms disulfide bonds that contribute significantly to protein stability?",o:["Methionine","Serine","Cysteine","Threonine"],a:2},
  {id:326,s:3,t:"Amino Acids",type:"mcq",q:"Which amino acid contains an imidazole ring and commonly participates in enzyme active sites?",o:["Arginine","Histidine","Lysine","Tryptophan"],a:1},
  {id:327,s:3,t:"Amino Acids",type:"mcq",q:"Which pair consists entirely of aromatic amino acids?",o:["Phenylalanine and Tyrosine","Glycine and Alanine","Lysine and Arginine","Serine and Threonine"],a:0},
  {id:328,s:3,t:"Amino Acids",type:"mcq",q:"Which amino acid would be expected to absorb ultraviolet light?",o:["Alanine","Valine","Tyrosine","Glycine"],a:2},
  {id:329,s:3,t:"Amino Acid Metabolism",type:"mcq",q:"Which amino acid is classified as purely ketogenic?",o:["Valine","Glycine","Leucine","Serine"],a:2},
  {id:330,s:3,t:"Amino Acid Metabolism",type:"mcq",q:"Which of the following is both ketogenic and glucogenic?",o:["Phenylalanine","Alanine","Glycine","Arginine"],a:0},
  {id:331,s:3,t:"Essential Amino Acids",type:"mcq",q:"Which amino acid is classified as semi-essential?",o:["Valine","Histidine","Glycine","Serine"],a:1},
  {id:332,s:3,t:"Amino Acid Metabolism",type:"mcq",q:"During decarboxylation of an amino acid, which molecule is removed?",o:["NH₃","H₂O","CO₂","H₂"],a:2},
  {id:333,s:3,t:"Amino Acid Metabolism",type:"mcq",q:"Histamine is produced by decarboxylation of:",o:["Histidine","Lysine","Arginine","Tyrosine"],a:0},
  {id:334,s:3,t:"Amino Acid Metabolism",type:"mcq",q:"Which reaction is responsible for converting glutamate into glutamine?",o:["Transamination","Oxidative deamination","Decarboxylation","Amide formation"],a:3},
  {id:335,s:3,t:"Amino Acid Metabolism",type:"mcq",q:"In transamination, the amino group is transferred to:",o:["An alcohol","A fatty acid","An α-keto acid","Carbon dioxide"],a:2},
  {id:336,s:3,t:"Amino Acid Metabolism",type:"mcq",q:"Oxidative deamination produces:",o:["A peptide and water","A keto acid and ammonia","An amide and carbon dioxide","A disulfide bond"],a:1},
  {id:337,s:3,t:"Protein Structure",type:"mcq",q:"Peptide bonds are formed between:",o:["Two amino groups","Two carboxyl groups","An α-amino group and an α-carboxyl group","Two R groups"],a:2},
  {id:338,s:3,t:"Amino Acid Tests",type:"mcq",q:"Which amino acid gives a yellow color instead of purple with the ninhydrin test?",o:["Glycine","Alanine","Proline","Valine"],a:2},
  {id:339,s:3,t:"Amino Acid Tests",type:"mcq",q:"Sanger's reagent is primarily used to identify:",o:["C-terminal amino acid","Sulfur-containing amino acids","N-terminal amino acid","Aromatic amino acids"],a:2},
  {id:340,s:3,t:"Amino Acid Tests",type:"mcq",q:"Which test specifically detects arginine?",o:["Pauly's test","Sakaguchi's test","Millon's test","Sulfur test"],a:1},
  // ── CHEMISTRY OF CHO-2 ─────────────────────────────────────────────────────
  {id:341,s:1,t:"Carbohydrate Classification",type:"mcq",q:"A carbohydrate is classified as a ketose rather than an aldose because it:",o:["Contains six carbon atoms","Exists predominantly in ring form","Possesses a ketone functional group","Contains multiple hydroxyl groups","Forms glycosidic bonds"],a:2},
  {id:342,s:1,t:"Carbohydrates",type:"mcq",q:"Which statement best explains why carbohydrates perform many biological functions?",o:["They are composed only of carbon and hydrogen","They possess asymmetric carbons, form rings, polymers, and hydrogen bonds","They are all highly soluble in water","They all serve as energy sources only","They contain peptide bonds"],a:1},
  {id:343,s:1,t:"Carbohydrate Classification",type:"mcq",q:"A monosaccharide containing five carbon atoms and an aldehyde group is a:",o:["Ketopentose","Aldopentose","Aldohexose","Ketohexose","Aldotriose"],a:1},
  {id:344,s:1,t:"Stereochemistry",type:"mcq",q:"Why can glucose exist in 16 stereoisomeric forms?",o:["It has 16 carbon atoms","It contains four chiral centers","It exists in both α and β forms","It forms pyranose rings","It contains four hydroxyl groups"],a:1},
  {id:345,s:1,t:"Stereochemistry",type:"mcq",q:"Which pair represents enantiomers?",o:["D-glucose and D-galactose","α-D-glucose and β-D-glucose","D-glucose and L-glucose","Glucose and fructose","Mannose and galactose"],a:2},
  {id:346,s:1,t:"Stereochemistry",type:"mcq",q:"Galactose differs from glucose at:",o:["Carbon 1","Carbon 2","Carbon 3","Carbon 4","Carbon 6"],a:3},
  {id:347,s:1,t:"Stereochemistry",type:"mcq",q:"Which statement correctly distinguishes epimers from anomers?",o:["Epimers differ at all chiral centers","Anomers differ at the anomeric carbon, while epimers differ at another single chiral carbon","Epimers are mirror images","Anomers occur only in open-chain sugars","Epimers have identical optical properties"],a:1},
  {id:348,s:1,t:"Carbohydrate Chemistry",type:"mcq",q:"The pyranose ring of glucose forms through reaction between:",o:["C1 and C2","C2 and C4","C5 hydroxyl and C1 aldehyde","C6 hydroxyl and C1 aldehyde","C3 hydroxyl and C1 aldehyde"],a:2},
  {id:349,s:1,t:"Carbohydrate Chemistry",type:"mcq",q:"Fructose forms a furanose ring because cyclization involves:",o:["C1 aldehyde and C5 hydroxyl","C2 ketone and C5 hydroxyl","C2 ketone and C6 hydroxyl","C1 aldehyde and C4 hydroxyl","C3 ketone and C5 hydroxyl"],a:1},
  {id:350,s:1,t:"Reducing Sugars",type:"mcq",q:"Which disaccharide is non-reducing?",o:["Lactose","Maltose","Cellobiose","Sucrose","Gentiobiose"],a:3},
  {id:351,s:1,t:"Reducing Sugars",type:"mcq",q:"Lactose is a reducing sugar because:",o:["It contains galactose","It contains a β(1→4) bond","One anomeric carbon remains free","It is found in milk","It is hydrolyzed by lactase"],a:2},
  {id:352,s:1,t:"Polysaccharides",type:"mcq",q:"Which pair best illustrates differences in branching frequency?",o:["Cellulose and chitin","Glycogen and amylopectin","Cellulose and glycogen","Inulin and cellulose","Hyaluronic acid and heparin"],a:1},
  {id:353,s:1,t:"Polysaccharides",type:"mcq",q:"Amylose and cellulose differ mainly because of:",o:["Monomer composition","Molecular weight","Glycosidic bond configuration","Solubility in water","Carbon number"],a:2},
  {id:354,s:1,t:"Polysaccharides",type:"mcq",q:"A polysaccharide requiring both α-amylase and α-1,6-glucosidase contains:",o:["Only α(1→4) bonds","Only β(1→4) bonds","α(1→4) and α(1→6) bonds","β(1→6) bonds only","β(2→1) bonds"],a:2},
  {id:355,s:1,t:"Polysaccharides",type:"mcq",q:"The major storage form of glucose in animals is:",o:["Amylose","Amylopectin","Cellulose","Glycogen","Inulin"],a:3},
  {id:356,s:1,t:"Polysaccharides",type:"mcq",q:"Humans cannot digest cellulose because:",o:["Cellulose is insoluble","Cellulose contains galactose","Humans lack cellulase","Cellulose is highly branched","Cellulose contains sulfate groups"],a:2},
  {id:357,s:1,t:"Glycosaminoglycans",type:"mcq",q:"Glycosaminoglycans form gels mainly because they:",o:["Are highly branched","Contain proteins","Attract large amounts of water","Contain fructose","Have α(1→4) bonds"],a:2},
  {id:358,s:1,t:"Glycosaminoglycans",type:"mcq",q:"Hyaluronic acid is unique because it is:",o:["Sulfated","Protein-bound","Made only of glucose","Not sulfated and not protein-bound","Intracellular"],a:3},
  {id:359,s:1,t:"Carbohydrate Chemistry",type:"mcq",q:"If mutarotation is prevented, what happens?",o:["Optical rotation remains constant","Glucose becomes entirely β-glucose","Reducing ability is lost","Ring formation stops","Chiral centers disappear"],a:0},
  {id:360,s:1,t:"Stereochemistry",type:"mcq",q:"Why are α- and β-glucose called anomers?",o:["They differ at all chiral centers","They are mirror images","They differ only at the anomeric carbon","They have different formulas","One is an aldose and the other a ketose"],a:2},
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const pct = (c: number, t: number) => t === 0 ? 0 : Math.round(c / t * 100);

// ── PDF Download ──────────────────────────────────────────────────────────────
function downloadAllQuestions() {
  const secGroups: Record<number, Question[]> = {1:[],2:[],3:[],4:[],5:[]};
  ALL_Q.forEach(q => secGroups[q.s].push(q));

  const qHTML = [1,2,3,4,5].map(s => {
    const qs = secGroups[s];
    if (!qs.length) return "";
    return `
      <div class="sec-header" style="background:${SECS[s].col}22;border-left:4px solid ${SECS[s].col};padding:10px 16px;margin:28px 0 16px;border-radius:4px;">
        <strong style="color:${SECS[s].col};font-size:1rem;">${SECS[s].icon} Section ${s}: ${SECS[s].title}</strong>
        <div style="color:#64748b;font-size:0.8rem;margin-top:2px;">${SECS[s].rule}</div>
      </div>
      ${qs.map((q, qi) => {
        const opts = q.type === "multi" ? S3 : q.type === "ar" ? S4 : q.o;
        let body = "";
        if (q.type === "mcq") body = `<p style="font-weight:600;margin:0 0 10px;font-size:0.95rem;">${qi+1}. ${q.q}</p>`;
        else if (q.type === "match") body = `<p style="font-weight:600;margin:0 0 6px;font-size:0.95rem;">${qi+1}. Match: <em>"${q.phrase}"</em></p>`;
        else if (q.type === "multi") {
          const mq = q as Multi;
          body = `<p style="font-weight:600;margin:0 0 6px;font-size:0.95rem;">${qi+1}. ${mq.q}</p>
          <div style="margin:0 0 8px 16px;">${mq.st.map((st,i)=>`<div style="margin-bottom:3px;color:#475569;font-size:0.85rem;"><strong>${i+1}.</strong> ${st}</div>`).join("")}</div>`;
        } else if (q.type === "ar") {
          const aq = q as AR;
          body = `<p style="font-weight:600;margin:0 0 6px;font-size:0.95rem;">${qi+1}. Assertion/Reason</p>
          <div style="margin:0 0 4px 12px;font-size:0.88rem;"><strong style="color:#3b82f6;">Assertion:</strong> ${aq.assert}</div>
          <div style="margin:0 0 8px 12px;font-size:0.88rem;"><strong style="color:#7c3aed;">Reason:</strong> ${aq.reason}</div>`;
        }
        return `<div style="margin-bottom:14px;padding:12px 14px;border:1px solid #e2e8f0;border-radius:8px;page-break-inside:avoid;">
          ${body}
          ${opts.map((o, i) => `<div style="margin:3px 0 3px 12px;font-size:0.875rem;${i===q.a?'color:#16a34a;font-weight:700;':''}">${LABELS[i]}. ${o}${i===q.a?' ✓':''}</div>`).join("")}
          <div style="margin-top:6px;font-size:0.75rem;color:#94a3b8;">Topic: ${q.t}</div>
        </div>`;
      }).join("")}
    `;
  }).join("");

  const html = `<!DOCTYPE html><html lang="en"><head>
  <meta charset="UTF-8"/>
  <title>UNEC BIC 1 — Medical Biochemistry Question Bank | campusmarketapp.com</title>
  <style>
    *{box-sizing:border-box}body{font-family:Georgia,serif;max-width:820px;margin:0 auto;padding:28px 24px;color:#1e293b;font-size:14px;}
    @media print{body{padding:16px}@page{margin:1.2cm}}
  </style>
</head><body>
  <div style="text-align:center;border-bottom:3px solid #1d4ed8;padding-bottom:20px;margin-bottom:28px;">
    <div style="font-size:2.5rem;margin-bottom:6px;">🧬</div>
    <h1 style="font-size:1.6rem;margin:0 0 4px;color:#1e293b;">UNEC Medical Biochemistry — BIC 1</h1>
    <h2 style="font-size:1.1rem;font-weight:400;color:#475569;margin:0 0 10px;">Combined Question Bank with Answers (${ALL_Q.length} Questions)</h2>
    <div style="background:linear-gradient(135deg,#064e3b,#0c2a1a);border:2px solid #10b981;border-radius:10px;padding:12px 20px;display:inline-block;margin-bottom:8px;">
      <div style="color:#10b981;font-weight:700;font-size:1rem;">🛍️ Powered by Campus Market App</div>
      <div style="color:#6ee7b7;font-size:0.85rem;margin-top:2px;">campusmarketapp.com · Insure Your Business · Nigeria's #1 Student Marketplace</div>
    </div>
    <div style="color:#64748b;font-size:0.8rem;">MCQ · Matching · Multi-Statement · Assertion-Reason · 5 Sections</div>
  </div>
  ${qHTML}
  <div style="text-align:center;margin-top:40px;border-top:2px solid #e2e8f0;padding-top:20px;">
    <div style="background:linear-gradient(135deg,#064e3b,#0c2a1a);border:1px solid #10b981;border-radius:10px;padding:16px 24px;display:inline-block;">
      <div style="color:#10b981;font-weight:700;font-size:1.1rem;">🛍️ Campus Market App</div>
      <div style="color:#6ee7b7;font-size:0.85rem;margin-top:4px;">campusmarketapp.com</div>
      <div style="color:#a7f3d0;font-size:0.8rem;margin-top:4px;">Insure Your Business · Build Your Future · Conquer Every Exam</div>
    </div>
    <div style="color:#94a3b8;font-size:0.75rem;margin-top:12px;">© Campus Market App · UNEC Medical Biochemistry BIC 1 · All questions for educational purposes</div>
  </div>
</body></html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 600);
  }
}

// ── AI Markdown Renderer ──────────────────────────────────────────────────────
const renderMd = (text: string) => text.split("\n").map((line, i) => {
  if (line.startsWith("## ")) return <h3 key={i} style={{color:"#60a5fa",fontFamily:"Georgia,serif",marginTop:"1.4rem",marginBottom:"0.4rem",borderBottom:"1px solid #1e3a5f",paddingBottom:"4px",fontSize:"1rem"}}>{line.slice(3)}</h3>;
  if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) return <li key={i} style={{marginLeft:"1.2rem",color:"#cbd5e1",lineHeight:"1.65",marginBottom:"3px",fontSize:"0.88rem"}}>{line.replace(/^[-*]\s/,"")}</li>;
  if (line.includes("Campus Market")) return <div key={i} style={{background:"linear-gradient(135deg,#0d2a1e,#0d1f38)",border:"1px solid #10b981",borderRadius:"12px",padding:"14px 18px",margin:"1rem 0",color:"#6ee7b7",fontWeight:"700",fontSize:"0.95rem",textAlign:"center",lineHeight:"1.7"}}>{line}</div>;
  if (line.trim() === "") return <br key={i}/>;
  return <p key={i} style={{color:"#cbd5e1",lineHeight:"1.65",marginBottom:"2px",fontSize:"0.88rem"}}>{line}</p>;
});

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box}.opt{transition:all .2s;cursor:pointer}.opt:hover{transform:translateX(3px)}
.pulse{animation:pulse 2s infinite}.fadeIn{animation:fadeIn .45s ease}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}@keyframes fadeIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:2px}`;

// ── Main Component ────────────────────────────────────────────────────────────
export default function BIC1CBT() {
  const { user } = useAuth();
  const [qs, setQs] = useState<Question[]>([]);
  const [sessionOpen, setSessionOpen] = useState<boolean | null>(null); // null = loading
  const [lockedMessage, setLockedMessage] = useState("This session is currently locked by the admin.");
  const visitorLogId = useRef<string | null>(null);

  // ── Check session lock status + log visitor ──────────────────────────────
  useEffect(() => {
    const checkAndLog = async () => {
      try {
        // 1. Check lock status
        const { data: session } = await (supabase as any)
          .from("academic_sessions")
          .select("is_open, locked_message")
          .eq("course_id", "bic1")
          .maybeSingle();

        const open = session ? session.is_open : true;
        setSessionOpen(open);
        if (session?.locked_message) setLockedMessage(session.locked_message);

        // 2. Log visitor (only if session is open)
        if (open) {
          const { data: logEntry } = await (supabase as any)
            .from("academic_visitors")
            .insert({
              course_id: "bic1",
              user_id: user?.id || null,
              user_email: user?.email || null,
              user_name: user?.user_metadata?.full_name || user?.email?.split("@")[0] || null,
              completed_test: false,
            })
            .select("id")
            .single();
          if (logEntry?.id) visitorLogId.current = logEntry.id;
        }
      } catch {
        setSessionOpen(true); // fail open — don't block students on DB error
      }
    };
    checkAndLog();
  }, [user]);

  // ── Log completion when test is submitted ────────────────────────────────
  const logCompletion = async (score: number, total: number) => {
    if (!visitorLogId.current) return;
    const percentage = Math.round(score / total * 100);
    await (supabase as any)
      .from("academic_visitors")
      .update({ completed_test: true, score, total_questions: total, percentage })
      .eq("id", visitorLogId.current);
  };
  const [phase, setPhase] = useState<"intro"|"test"|"loading"|"results">("intro");
  const [idx, setIdx] = useState(0);
  const [ans, setAns] = useState<Record<number,number>>({});
  const [sel, setSel] = useState<number|null>(null);
  const [acked, setAcked] = useState(new Set<number>());
  const [analysis, setAnalysis] = useState<Analysis|null>(null);

  const q = qs[idx];
  const si = q ? SECS[q.s] : null;
  const showSecIntro = phase === "test" && q && !acked.has(q.s);
  const opts = q ? (q.type === "multi" ? S3 : q.type === "ar" ? S4 : q.o) : [];

  const startExam = () => {
    const picked = shuffle(ALL_Q).slice(0, 120).sort((a, b) => a.s - b.s);
    setQs(picked); setAns({}); setSel(null); setAcked(new Set()); setAnalysis(null); setIdx(0); setPhase("test");
  };

  const selOpt = (i: number) => { if (sel !== null) return; setSel(i); setAns(p => ({...p,[idx]:i})); };
  const goNext = () => {
    if (sel === null) return;
    if (idx < qs.length - 1) { const ni = idx+1; setIdx(ni); setSel(ans[ni] !== undefined ? ans[ni] : null); }
    else submitTest();
  };
  const goBack = () => { if (idx <= 0) return; const pi = idx-1; setIdx(pi); setSel(ans[pi] !== undefined ? ans[pi] : null); };

  const submitTest = async () => {
    setPhase("loading");
    const score = qs.reduce((acc, q, i) => acc + (ans[i] === q.a ? 1 : 0), 0);
    await logCompletion(score, qs.length);
    const ss: Record<number,number> = {1:0,2:0,3:0,4:0,5:0};
    const sn: Record<number,number> = {1:0,2:0,3:0,4:0,5:0};
    const topics: Record<string,{c:number;n:number}> = {};
    qs.forEach((q, i) => {
      sn[q.s]++; if (ans[i] === q.a) ss[q.s]++;
      if (!topics[q.t]) topics[q.t] = {c:0,n:0};
      topics[q.t].n++; if (ans[i] === q.a) topics[q.t].c++;
    });
    const tStr = Object.entries(topics).map(([k,v]) => `${k}: ${v.c}/${v.n} (${pct(v.c,v.n)}%)`).join("\n");
    const sStr = [1,2,3,4,5].map(s => `${SECS[s].title}: ${ss[s]}/${sn[s]} (${pct(ss[s],sn[s])}%)`).join(" | ");

    const prompt = `A 2nd Year MBBS/BDS student at UNEC completed a Medical Biochemistry CBT (120 randomised questions from BIC 1, 5 sections).

Score: ${score}/120 (${pct(score,120)}%)
${sStr}

Topic Performance:
${tStr}

Provide a medical educator-style analysis:

## 📊 Performance Summary
(Warm 2-3 sentences. MBBS pass is typically 50%)

## 💪 Strengths
(Sections/topics ≥ 70% — specific clinical praise)

## 📚 Areas to Strengthen
(Sections/topics < 60% — kind but direct feedback)

## 🎯 Study Recommendations
(4-5 targeted strategies for weak topics — include mnemonics or clinical correlations)

## 🧪 Practice Questions
(4 MCQs with 5 options targeting 2 weakest topics. Mark ✅ correct answer)

## 🏆 Final Word
End ONLY with: "🏆 Campus Market app is all about success — insure your business, build your future, and conquer every exam!"`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:prompt}]})
      });
      const data = await res.json();
      const text = data.content?.map((c: any) => c.text||"").join("\n") || "Analysis unavailable.";
      setAnalysis({score,ss,sn,topics,text});
    } catch {
      setAnalysis({score,ss,sn,topics,text:`## 📊 Performance Summary\nYou completed the 120-question BIC 1 CBT!\n\n## 🏆 Final Word\n🏆 Campus Market app is all about success — insure your business, build your future, and conquer every exam!`});
    }
    setPhase("results");
  };

  // ── SESSION LOADING ──────────────────────────────────────────────────────────
  if (sessionOpen === null) return (
    <div style={{minHeight:"100vh",background:"#060b14",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",flexDirection:"column",gap:"12px"}}>
      <style>{CSS}</style>
      <div className="pulse" style={{fontSize:"2.5rem"}}>🧬</div>
      <p style={{color:"#475569",fontSize:"0.88rem"}}>Checking session status...</p>
    </div>
  );

  // ── SESSION LOCKED ───────────────────────────────────────────────────────────
  if (sessionOpen === false) return (
    <div style={{minHeight:"100vh",background:"#060b14",display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",fontFamily:"'DM Sans',sans-serif"}}>
      <style>{CSS}</style>
      <div className="fadeIn" style={{maxWidth:"480px",width:"100%",textAlign:"center"}}>
        <div style={{fontSize:"4rem",marginBottom:"12px"}}>🔒</div>
        <h1 style={{fontFamily:"'Crimson Pro',serif",color:"#e2e8f0",fontSize:"1.8rem",margin:"0 0 8px"}}>Session Locked</h1>
        <div style={{background:"#0c1420",border:"1px solid #ef444433",borderRadius:"14px",padding:"18px 20px",marginBottom:"20px"}}>
          <p style={{color:"#fca5a5",fontSize:"0.92rem",lineHeight:"1.7",margin:0}}>{lockedMessage}</p>
        </div>
        <div style={{background:"linear-gradient(135deg,#064e3b,#0c2a1a)",border:"1px solid #10b981",borderRadius:"12px",padding:"14px 18px",marginBottom:"20px"}}>
          <div style={{color:"#10b981",fontWeight:"700",fontSize:"0.88rem"}}>🛍️ Campus Market App · campusmarketapp.com</div>
          <div style={{color:"#6ee7b7",fontSize:"0.78rem",marginTop:"3px"}}>While you wait — insure your business on Campus Market!</div>
        </div>
        <button onClick={() => window.history.back()} style={{background:"#0c1420",border:"1px solid #1e3a5f",borderRadius:"10px",padding:"11px 28px",color:"#475569",fontSize:"0.88rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
          ← Go Back
        </button>
      </div>
    </div>
  );

  // ── INTRO ───────────────────────────────────────────────────────────────────
  if (phase === "intro") return (
    <div style={{minHeight:"100vh",background:"#060b14",display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",fontFamily:"'DM Sans',sans-serif"}}>
      <style>{CSS}</style>
      <div className="fadeIn" style={{maxWidth:"600px",width:"100%"}}>
        <div style={{background:"linear-gradient(135deg,#064e3b,#0c1a0c)",border:"1px solid #10b981",borderRadius:"14px",padding:"14px 20px",marginBottom:"20px",display:"flex",alignItems:"center",gap:"12px"}}>
          <span style={{fontSize:"1.6rem"}}>🛍️</span>
          <div>
            <div style={{color:"#10b981",fontWeight:"700",fontSize:"0.88rem"}}>Campus Market App · campusmarketapp.com</div>
            <div style={{color:"#6ee7b7",fontSize:"0.78rem"}}>Insure your business success · Nigeria's #1 Student Marketplace</div>
          </div>
          <div style={{marginLeft:"auto",background:"#10b98122",border:"1px solid #10b981",borderRadius:"8px",padding:"4px 12px",color:"#10b981",fontSize:"0.72rem",fontWeight:"700"}}>POWERED BY</div>
        </div>
        <div style={{textAlign:"center",marginBottom:"20px"}}>
          <div style={{fontSize:"3rem",marginBottom:"8px"}}>🧬</div>
          <h1 style={{fontFamily:"'Crimson Pro',serif",fontSize:"2rem",fontWeight:"700",color:"#e2e8f0",margin:"0 0 4px"}}>Medical Biochemistry — BIC 1</h1>
          <p style={{color:"#334155",fontSize:"0.78rem",marginBottom:"4px"}}>UNEC · 2nd Year MBBS/BDS</p>
          <p style={{color:"#475569",fontSize:"0.78rem",margin:0}}>120 Random Questions · {ALL_Q.length}-Question Bank · 5 Sections · AI Analysis</p>
        </div>
        <div style={{background:"#0c1420",border:"1px solid #1e3a5f",borderRadius:"16px",padding:"18px 22px",marginBottom:"20px"}}>
          {[1,2,3,4,5].map(s => (
            <div key={s} style={{display:"flex",gap:"10px",alignItems:"center",marginBottom:s<5?"11px":0}}>
              <span style={{fontSize:"1.1rem"}}>{SECS[s].icon}</span>
              <span style={{color:SECS[s].col,fontWeight:"600",fontSize:"0.82rem"}}>{SECS[s].title}</span>
            </div>
          ))}
        </div>
        <div style={{background:"#0c1420",border:"1px solid #7c3aed33",borderRadius:"12px",padding:"12px 16px",marginBottom:"20px",fontSize:"0.78rem",color:"#7c3aed",textAlign:"center"}}>
          🔀 Questions shuffle randomly every session — no two attempts are the same!
        </div>
        <button onClick={startExam} style={{width:"100%",background:"linear-gradient(135deg,#1d4ed8,#2563eb)",border:"none",borderRadius:"12px",padding:"14px",color:"white",fontSize:"0.98rem",fontWeight:"600",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",boxShadow:"0 0 28px #1d4ed844",transition:"all .2s"}}
          onMouseOver={e=>{(e.currentTarget as HTMLButtonElement).style.transform="scale(1.02)"}}
          onMouseOut={e=>{(e.currentTarget as HTMLButtonElement).style.transform="scale(1)"}}
        >Begin BIC 1 Examination →</button>
      </div>
    </div>
  );

  // ── SECTION INTRO ───────────────────────────────────────────────────────────
  if (showSecIntro && si) return (
    <div style={{minHeight:"100vh",background:"#060b14",display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",fontFamily:"'DM Sans',sans-serif"}}>
      <style>{CSS}</style>
      <div className="fadeIn" style={{maxWidth:"480px",width:"100%",textAlign:"center"}}>
        <div style={{fontSize:"3rem",marginBottom:"12px"}}>{si.icon}</div>
        <h2 style={{fontFamily:"'Crimson Pro',serif",color:"#e2e8f0",fontSize:"1.7rem",margin:"0 0 4px"}}>{si.title}</h2>
        <p style={{color:"#334155",fontSize:"0.78rem",marginBottom:"16px"}}>UNEC BIC 1 · Medical Biochemistry</p>
        <div style={{background:"#0c1420",border:`1px solid ${si.col}44`,borderRadius:"14px",padding:"16px",marginBottom:"14px"}}>
          <p style={{color:"#94a3b8",lineHeight:"1.7",margin:0,fontSize:"0.88rem"}}>{si.rule}</p>
        </div>
        <div style={{background:"#064e3b22",border:"1px solid #10b98144",borderRadius:"10px",padding:"8px 14px",marginBottom:"20px",fontSize:"0.75rem",color:"#6ee7b7"}}>
          🛍️ Powered by Campus Market App · campusmarketapp.com
        </div>
        <button onClick={() => setAcked(p => new Set([...p, q.s]))} style={{background:`linear-gradient(135deg,${si.col}cc,${si.col})`,border:"none",borderRadius:"12px",padding:"13px 36px",color:"#060b14",fontSize:"0.95rem",fontWeight:"700",cursor:"pointer",transition:"all .2s"}}
          onMouseOver={e=>{(e.currentTarget as HTMLButtonElement).style.transform="scale(1.03)"}}
          onMouseOut={e=>{(e.currentTarget as HTMLButtonElement).style.transform="scale(1)"}}
        >Start Section →</button>
      </div>
    </div>
  );

  // ── LOADING ─────────────────────────────────────────────────────────────────
  if (phase === "loading") return (
    <div style={{minHeight:"100vh",background:"#060b14",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",textAlign:"center",color:"#94a3b8"}}>
      <style>{CSS}</style>
      <div>
        <div className="pulse" style={{fontSize:"3.5rem",marginBottom:"16px"}}>🧬</div>
        <h2 style={{fontFamily:"'Crimson Pro',serif",color:"#e2e8f0",marginBottom:"8px"}}>Marking Your Paper...</h2>
        <p style={{fontSize:"0.9rem"}}>AI is analysing your 120 answers across all 5 sections</p>
        <div style={{marginTop:"20px",display:"flex",gap:"8px",justifyContent:"center"}}>
          {[0,1,2,3].map(i => <div key={i} style={{width:"8px",height:"8px",borderRadius:"50%",background:"#3b82f6",animation:`pulse ${0.6+i*0.15}s ${i*0.15}s infinite`}}/>)}
        </div>
        <div style={{marginTop:"24px",background:"#064e3b22",border:"1px solid #10b98144",borderRadius:"10px",padding:"8px 20px",fontSize:"0.75rem",color:"#6ee7b7"}}>
          🛍️ Campus Market App · campusmarketapp.com
        </div>
      </div>
    </div>
  );

  // ── RESULTS ─────────────────────────────────────────────────────────────────
  if (phase === "results" && analysis) {
    const {score,ss,sn,topics,text} = analysis;
    const grd = score>=96?"A+":score>=84?"A":score>=72?"B":score>=60?"C":score>=48?"D":"F";
    const gCol = score>=72?"#34d399":score>=60?"#fbbf24":"#ef4444";
    return (
      <div style={{minHeight:"100vh",background:"#060b14",fontFamily:"'DM Sans',sans-serif",padding:"16px 16px 36px"}}>
        <style>{CSS}</style>
        <div style={{maxWidth:"680px",margin:"0 auto"}}>
          <div style={{textAlign:"center",padding:"16px 0 14px"}}>
            <div style={{fontFamily:"'Crimson Pro',serif",fontSize:"3.8rem",fontWeight:"700",color:gCol,lineHeight:1}}>{score}<span style={{fontSize:"1.8rem",color:"#475569"}}>/120</span></div>
            <div style={{fontSize:"1.1rem",fontWeight:"700",color:gCol,marginBottom:"4px"}}>Grade {grd} · {pct(score,120)}%</div>
            <p style={{color:"#475569",fontSize:"0.78rem",margin:0}}>UNEC Medical Biochemistry BIC 1 · Combined CBT</p>
          </div>

          {/* Section Scores */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"9px",marginBottom:"14px"}}>
            {[1,2,3,4,5].map(s => {
              if (!sn[s]) return null;
              const c = SECS[s].col, p = pct(ss[s], sn[s]);
              return (<div key={s} style={{background:"#0c1420",border:`1px solid ${c}33`,borderRadius:"12px",padding:"12px",gridColumn:s===5&&[1,2,3,4].filter(x=>sn[x]).length%2!==0?"1 / -1":undefined}}>
                <div style={{color:c,fontSize:"0.7rem",fontWeight:"600",marginBottom:"5px"}}>{SECS[s].icon} {SECS[s].title}</div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                  <span style={{color:"#e2e8f0",fontWeight:"700",fontSize:"1.05rem"}}>{ss[s]}/{sn[s]}</span>
                  <span style={{color:p>=70?"#34d399":p>=50?"#fbbf24":"#ef4444",fontSize:"0.8rem",fontWeight:"600"}}>{p}%</span>
                </div>
                <div style={{height:"4px",background:"#1e293b",borderRadius:"2px",overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${p}%`,background:c,borderRadius:"2px"}}/>
                </div>
              </div>);
            })}
          </div>

          {/* Topic Breakdown */}
          <div style={{background:"#0c1420",border:"1px solid #1e3a5f",borderRadius:"14px",padding:"16px",marginBottom:"14px"}}>
            <h3 style={{color:"#93c5fd",fontFamily:"'Crimson Pro',serif",margin:"0 0 12px",fontSize:"0.95rem"}}>📊 Topic Breakdown</h3>
            <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
              {Object.entries(topics).map(([t,{c,n}]) => {
                const p = pct(c,n), col = p>=70?"#34d399":p>=50?"#fbbf24":"#ef4444";
                return (<div key={t} style={{background:"#111827",border:`1px solid ${col}44`,borderRadius:"8px",padding:"5px 10px"}}>
                  <div style={{color:"#e2e8f0",fontSize:"0.73rem",fontWeight:"600"}}>{t}</div>
                  <div style={{color:col,fontSize:"0.7rem"}}>{c}/{n} · {p}%</div>
                </div>);
              })}
            </div>
          </div>

          {/* Download Button */}
          <button onClick={downloadAllQuestions} style={{width:"100%",background:"linear-gradient(135deg,#1e3a5f,#1d4ed8)",border:"1px solid #3b82f6",borderRadius:"12px",padding:"13px",color:"#93c5fd",fontSize:"0.9rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:"600",transition:"all .2s",marginBottom:"10px",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}
            onMouseOver={e=>{(e.currentTarget as HTMLButtonElement).style.background="linear-gradient(135deg,#1d4ed8,#2563eb)";(e.currentTarget as HTMLButtonElement).style.color="#fff"}}
            onMouseOut={e=>{(e.currentTarget as HTMLButtonElement).style.background="linear-gradient(135deg,#1e3a5f,#1d4ed8)";(e.currentTarget as HTMLButtonElement).style.color="#93c5fd"}}
          >
            <span>📥</span> Download All {ALL_Q.length} Questions + Answers (Print/PDF)
          </button>

          {/* Campus Market Promo */}
          <div style={{background:"linear-gradient(135deg,#064e3b,#0c2a1a)",border:"1px solid #10b981",borderRadius:"14px",padding:"18px 20px",marginBottom:"14px"}}>
            <div style={{display:"flex",gap:"12px",alignItems:"flex-start"}}>
              <span style={{fontSize:"2rem"}}>🛍️</span>
              <div>
                <div style={{color:"#10b981",fontWeight:"700",fontSize:"0.95rem",marginBottom:"4px"}}>Insure Your Business with Campus Market App</div>
                <p style={{color:"#6ee7b7",fontSize:"0.82rem",lineHeight:"1.6",margin:"0 0 8px"}}>List your products, reach thousands of campus buyers, and grow your business with confidence. <strong>campusmarketapp.com</strong> — Nigeria's #1 student marketplace.</p>
                <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                  {["🏪 List Products","💳 Secure Payments","📦 Order Tracking","⭐ TrustScore"].map(f => (
                    <span key={f} style={{background:"#10b98122",border:"1px solid #10b98144",borderRadius:"6px",padding:"3px 10px",color:"#6ee7b7",fontSize:"0.72rem"}}>{f}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* AI Analysis */}
          <div style={{background:"#0c1420",border:"1px solid #1e3a5f",borderRadius:"14px",padding:"20px",marginBottom:"14px"}}>
            <h3 style={{color:"#93c5fd",fontFamily:"'Crimson Pro',serif",margin:"0 0 10px",fontSize:"0.95rem"}}>🤖 AI Analysis & Recommendations</h3>
            <div style={{maxHeight:"55vh",overflowY:"auto",paddingRight:"4px"}}>{renderMd(text)}</div>
          </div>

          <button onClick={startExam} style={{width:"100%",background:"linear-gradient(135deg,#064e3b,#065f46)",border:"1px solid #10b981",borderRadius:"12px",padding:"13px",color:"#10b981",fontSize:"0.9rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:"600",transition:"all .2s",marginBottom:"8px"}}>
            🔀 New Shuffle — Retake with Different 120 Questions
          </button>
          <button onClick={() => {setPhase("intro");setQs([]);}} style={{width:"100%",background:"#0c1420",border:"1px solid #1e3a5f",borderRadius:"12px",padding:"13px",color:"#475569",fontSize:"0.88rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all .2s"}}>
            ← Back to Intro
          </button>
        </div>
      </div>
    );
  }

  // ── TEST ────────────────────────────────────────────────────────────────────
  if (phase !== "test" || !q || !si) return null;
  const progP = pct(idx+1, qs.length);

  return (
    <div style={{minHeight:"100vh",background:"#060b14",fontFamily:"'DM Sans',sans-serif",padding:"14px",display:"flex",flexDirection:"column",alignItems:"center"}}>
      <style>{CSS}</style>
      <div style={{maxWidth:"640px",width:"100%"}}>
        {/* Top bar */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
          <div style={{display:"flex",gap:"3px"}}>
            {[1,2,3,4,5].map(s => <div key={s} style={{height:"3px",width:"32px",borderRadius:"2px",background:q.s>s?"#1e3a5f":q.s===s?SECS[s].col:"#0f172a"}}/>)}
          </div>
          <div style={{background:"#064e3b22",border:"1px solid #10b98144",borderRadius:"6px",padding:"2px 8px",fontSize:"0.65rem",color:"#10b981",fontWeight:"600"}}>🛍️ Campus Market</div>
        </div>

        {/* Progress */}
        <div style={{marginBottom:"12px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
            <span style={{color:si.col,fontSize:"0.74rem",fontWeight:"600"}}>{si.icon} {si.title}</span>
            <span style={{color:"#334155",fontSize:"0.74rem"}}>{idx+1} / {qs.length}</span>
          </div>
          <div style={{height:"3px",background:"#0c1420",borderRadius:"2px",overflow:"hidden"}}>
            <div style={{height:"100%",width:`${progP}%`,background:`linear-gradient(90deg,${si.col}77,${si.col})`,transition:"width .4s ease"}}/>
          </div>
        </div>

        {/* Question Card */}
        <div style={{background:"#0c1420",border:`1px solid ${si.col}33`,borderRadius:"18px",padding:"18px",marginBottom:"10px"}}>
          <div style={{marginBottom:"10px",display:"flex",gap:"6px",flexWrap:"wrap"}}>
            <span style={{background:`${si.col}15`,color:si.col,padding:"2px 8px",borderRadius:"5px",fontSize:"0.68rem",fontWeight:"600"}}>{q.t}</span>
            {q.id > 200 && <span style={{background:"#7c3aed22",color:"#a78bfa",padding:"2px 8px",borderRadius:"5px",fontSize:"0.68rem",fontWeight:"600"}}>Exam 2</span>}
          </div>

          {q.type === "mcq" && <p style={{color:"#e2e8f0",fontSize:"0.97rem",fontWeight:"600",lineHeight:"1.65",margin:"0 0 14px",fontFamily:"'Crimson Pro',serif"}}>{q.q}</p>}

          {q.type === "match" && <div style={{marginBottom:"14px"}}>
            <p style={{color:"#64748b",fontSize:"0.74rem",marginBottom:"7px"}}>Match this phrase to the correct heading:</p>
            <div style={{background:"#111827",border:`1px solid ${si.col}44`,borderRadius:"9px",padding:"12px 14px",marginBottom:"8px"}}>
              <p style={{color:"#e2e8f0",fontSize:"0.96rem",fontWeight:"600",lineHeight:"1.6",margin:0,fontFamily:"'Crimson Pro',serif"}}>"{(q as Match).phrase}"</p>
            </div>
            <div style={{background:"#080f1a",borderRadius:"7px",padding:"7px 11px",fontSize:"0.7rem",color:"#334155",lineHeight:"1.7"}}>
              {q.o.map((h, i) => `${LABELS[i]}. ${h}`).join("  ·  ")}
            </div>
          </div>}

          {q.type === "multi" && <div style={{marginBottom:"14px"}}>
            <p style={{color:"#e2e8f0",fontSize:"0.96rem",fontWeight:"600",lineHeight:"1.6",margin:"0 0 10px",fontFamily:"'Crimson Pro',serif"}}>{(q as Multi).q}</p>
            <div style={{display:"flex",flexDirection:"column",gap:"5px",marginBottom:"9px"}}>
              {(q as Multi).st.map((s, i) => (
                <div key={i} style={{display:"flex",gap:"8px",background:"#111827",borderRadius:"8px",padding:"7px 11px"}}>
                  <span style={{color:si.col,fontWeight:"700",minWidth:"17px",fontSize:"0.8rem"}}>{i+1}.</span>
                  <span style={{color:"#94a3b8",fontSize:"0.82rem",lineHeight:"1.5"}}>{s}</span>
                </div>
              ))}
            </div>
            <div style={{background:"#080f1a",borderRadius:"7px",padding:"6px 11px",fontSize:"0.7rem",color:"#334155"}}>Key: A=1,2,3 · B=1,3 · C=2,4 · D=only 4 · E=all correct</div>
          </div>}

          {q.type === "ar" && <div style={{marginBottom:"14px"}}>
            <div style={{background:"#0d1f38",border:"1px solid #1e3a5f",borderRadius:"9px",padding:"10px 14px",marginBottom:"7px"}}>
              <div style={{color:"#60a5fa",fontSize:"0.66rem",fontWeight:"600",marginBottom:"3px",textTransform:"uppercase",letterSpacing:"1px"}}>Assertion</div>
              <p style={{color:"#e2e8f0",fontWeight:"600",fontSize:"0.93rem",lineHeight:"1.6",margin:0,fontFamily:"'Crimson Pro',serif"}}>{(q as AR).assert}</p>
            </div>
            <div style={{background:"#1a0d38",border:"1px solid #2e1a5f",borderRadius:"9px",padding:"10px 14px",marginBottom:"7px"}}>
              <div style={{color:"#a78bfa",fontSize:"0.66rem",fontWeight:"600",marginBottom:"3px",textTransform:"uppercase",letterSpacing:"1px"}}>Reason</div>
              <p style={{color:"#e2e8f0",fontSize:"0.93rem",lineHeight:"1.6",margin:0,fontFamily:"'Crimson Pro',serif"}}>{(q as AR).reason}</p>
            </div>
            <div style={{background:"#080f1a",borderRadius:"7px",padding:"6px 11px",fontSize:"0.68rem",color:"#334155"}}>A=Both✓+explain · B=Both✓,no explain · C=Assert✓Rsn✗ · D=Assert✗Rsn✓ · E=Both✗</div>
          </div>}

          {/* Options */}
          <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
            {opts.map((opt, i) => {
              let bg="#111827", border="#1e293b", col="#94a3b8";
              if (sel !== null) { if (i===q.a){bg="#0a2a1a";border="#22c55e";col="#86efac";}else if(i===sel&&sel!==q.a){bg="#2a0a0a";border="#ef4444";col="#fca5a5";} }
              return (<button key={i} className="opt" onClick={() => selOpt(i)} style={{background:bg,border:`1px solid ${border}`,borderRadius:"9px",padding:"9px 12px",textAlign:"left",display:"flex",gap:"8px",alignItems:"flex-start",color:col,opacity:sel!==null&&i!==q.a&&i!==sel?0.35:1,fontSize:"0.85rem",lineHeight:"1.5",cursor:"pointer"}}>
                <span style={{minWidth:"21px",height:"21px",borderRadius:"5px",background:`${border}33`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"700",fontSize:"0.73rem",color:border,flexShrink:0,marginTop:"1px"}}>{LABELS[i]}</span>
                <span style={{flex:1}}>{opt}</span>
                {sel !== null && i===q.a && <span style={{color:"#22c55e",flexShrink:0}}>✓</span>}
                {sel !== null && i===sel && sel!==q.a && <span style={{color:"#ef4444",flexShrink:0}}>✗</span>}
              </button>);
            })}
          </div>
        </div>

        {/* Nav */}
        <div style={{display:"flex",gap:"8px",marginBottom:"10px"}}>
          <button onClick={goBack} disabled={idx===0} style={{flex:1,background:"#0c1420",border:"1px solid #1e3a5f",borderRadius:"10px",padding:"11px",color:idx===0?"#1e293b":"#475569",cursor:idx===0?"not-allowed":"pointer",fontSize:"0.84rem",transition:"all .2s"}}>← Back</button>
          <button onClick={goNext} disabled={sel===null} style={{flex:2.5,background:sel===null?"#0c1420":`linear-gradient(135deg,${si.col}cc,${si.col})`,border:sel===null?"1px solid #1e3a5f":"none",borderRadius:"10px",padding:"11px",color:sel===null?"#1e293b":"#060b14",cursor:sel===null?"not-allowed":"pointer",fontWeight:"600",fontSize:"0.88rem",transition:"all .2s"}}>
            {idx===qs.length-1 ? "Submit Examination 🎯" : "Next →"}
          </button>
        </div>

        {/* Dot nav */}
        <div style={{display:"flex",justifyContent:"center",gap:"4px",flexWrap:"wrap"}}>
          {qs.filter(qq => qq.s===q.s).map((qq, i) => {
            const qi = qs.indexOf(qq), a = ans[qi];
            return (<div key={i} onClick={() => {setIdx(qi);setSel(ans[qi]!==undefined?ans[qi]:null);}} style={{width:"7px",height:"7px",borderRadius:"50%",cursor:"pointer",background:a===undefined?"#1e293b":a===qq.a?"#22c55e":"#ef4444",opacity:qi===idx?1:0.55,border:qi===idx?`1px solid ${si.col}`:"none",transition:"all .2s"}}/>);
          })}
        </div>
      </div>
    </div>
  );
}
