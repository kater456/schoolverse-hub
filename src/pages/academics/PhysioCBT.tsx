import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const LABELS = ["A","B","C","D","E"];

const SECS: Record<number,{col:string;icon:string;title:string;rule:string}> = {
  1:{col:"#38bdf8",icon:"⚡",title:"Neuromuscular & Synaptic Physiology",rule:"Select the ONE most correct answer from options A–E."},
  2:{col:"#34d399",icon:"🔬",title:"Cell Biology, Homeostasis & Transport",rule:"Select the ONE most correct answer from options A–E."},
  3:{col:"#f472b6",icon:"🩸",title:"Blood Groups, Hematology & Coagulation",rule:"Select the ONE most correct answer from options A–E."},
  4:{col:"#fbbf24",icon:"🫁",title:"Respiratory Physiology",rule:"Select the ONE most correct answer from options A–E."}
};

const ALL_Q = [
  // ── SECTION 1: NEUROMUSCULAR & SYNAPTIC PHYSIOLOGY ────────────────────────
  {id:1,s:1,t:"Neurotransmission",q:"The excitatory or inhibitory action of a neurotransmitter is determined by which of the following?",o:["Function of its postsynaptic receptor","Molecular composition","Shape of the synaptic vesicle","Distance between pre- and post-synaptic membranes","Ion of the synaptic vesicle"],a:0},
  {id:2,s:1,t:"Neurotransmission",q:"The release of neurotransmitter at a chemical synapse in the CNS is dependent upon which of the following?",o:["Synthesis of acetylcholinesterase","Hyperpolarization of the synaptic terminal","Polarisation of synaptic terminal","Opening of ligand-gated calcium channels","Influx of calcium into the presynaptic terminal"],a:4},
  {id:3,s:1,t:"Synaptic Physiology",q:"Which of the following is characteristic of the events occurring at an excitatory synapse?",o:["Massive efflux of calcium from the presynaptic terminal","Synaptic vesicles bind to the postsynaptic membrane","Voltage-gated potassium channels are closed","Ligand-gated channels open to allow sodium entry into the postsynaptic neuron","Voltage-gated bicarbonate channels are closed"],a:3},
  {id:4,s:1,t:"Smooth Muscle",q:"Which of the following is incorrect regarding smooth muscle?",o:["Excitation and contraction is very slow in smooth muscles","Smooth muscle has two types: single-unit and multi-unit","Myosin must not be phosphorylated for activation of myosin ATPase","Smooth muscle cells contain calmodulin","Sliding theory is also called ratchet theory"],a:2},
  {id:5,s:1,t:"Muscle Physiology",q:"Relaxation of the muscle occurs when:",o:["Calcium ions are pumped back into the L tubules","Detachment of myosin from actin obtains energy from breakdown of ADP","Calcium ions enter the tubules increasing sarcoplasmic calcium","Attachment of myosin from actin followed by relaxation","Detachment of myosin from actin obtains energy from breakdown of PI3K"],a:0},
  {id:6,s:1,t:"Neuromuscular Disease",q:"In Myasthenia gravis:",o:["There is isometric contraction","Lack of acetylcholine receptors","Lack of Calcium receptors","Lack of dopamine receptors","Lack of GABA receptors"],a:1},
  {id:7,s:1,t:"Action Potential",q:"Concerning the Propagation of AP; the following are true EXCEPT:",o:["Impulses move from presynaptic nerve cell across the synaptic cleft to postsynaptic muscle","Synapses permit conduction of impulses in two directions","Orthodromic Conduction is AP conduction in the right direction","Antidromic Conduction is AP conduction in the wrong direction","None of the above"],a:1},
  {id:8,s:1,t:"Autonomic Receptors",q:"Which type of cholinergic receptor is found at synapses between pre- and postganglionic neurons of the sympathetic system?",o:["Muscarinic","Alpha","Nicotinic","Beta1","Beta2"],a:2},
  {id:9,s:1,t:"Autonomic Receptors",q:"Which substance activates adrenergic alpha and beta receptors equally well?",o:["Acetylcholine","Norepinephrine","Epinephrine","Serotonin","Dopamine"],a:2},
  {id:10,s:1,t:"Action Potential",q:"Saltatory Conduction is found in:",o:["Cardiac Muscle fibers","Smooth Muscle Fibers","Unmyelinated Nerve Fibers","Myelinated Nerve Fibers","Action potential"],a:3},
  {id:11,s:1,t:"Autonomic Nervous System",q:"The function of which of the following is dominated by the sympathetic nervous system?",o:["Systemic blood vessels","Parotid","Gastrointestinal gland secretion","Salivary glands","Gastrointestinal motility"],a:0},
  {id:12,s:1,t:"Synaptic Physiology",q:"Excitatory postsynaptic Potential (EPSP) is usually:",o:["Suprathreshold","Subthreshold","Threshold","A and C","Inhibitory"],a:1},
  {id:13,s:1,t:"Muscle Physiology",q:"A single contraction of skeletal muscle is most likely to be terminated by which of the following?",o:["Closure of postsynaptic nicotinic acetylcholine receptor","Removal of acetylcholine from the neuromuscular junction","Removal of Ca++ from the terminal of the motor neuron","Removal of sarcoplasmic Ca++","Return of dihydropyridine receptor to resting conformation"],a:3},
  {id:14,s:1,t:"Muscle Proteins",q:"The functions of tropomyosin in skeletal muscle include:",o:["Sliding on actin to produce shortening","Releasing Ca++ after initiation of contraction","Binding to myosin during contraction","Acting as a 'relaxing protein' by covering myosin binding sites on actin","Generating ATP for the contractile mechanism"],a:3},
  {id:15,s:1,t:"Neuromuscular Disease",q:"A 42-year-old man with myasthenia gravis notes increased muscle strength when treated with an AChE Inhibitor. The basis for improvement is increased:",o:["Amount of acetylcholine released from motor nerves","Levels of ACh at the muscle end plates","Number of ACh receptors on the muscle end plates","Amount of norepinephrine released from motor nerves","Synthesis of neurotransmitter in motor nerves"],a:1},
  {id:16,s:1,t:"Neurotransmission",q:"The release of the neurotransmitter from the synaptic vesicles depends mainly on:",o:["Ca2+","K+","Na+","Mg2+","Zinc"],a:0},
  {id:17,s:1,t:"Acetylcholine",q:"The following are true about acetylcholine EXCEPT:",o:["It has a strong affinity for nicotinic receptors","Is derived from acetyl CoA and choline","Is synthesized by choline acetyl transferase","Is inactivated by reuptake","Initiates transmission of signals that create muscle movement"],a:3},
  {id:18,s:1,t:"Muscle Proteins",q:"Which of the following proteins contains a binding site for Ca2+?",o:["Actin","Myosin","Troponin","Tropomyosin","Nebulin"],a:2},
  {id:19,s:1,t:"Neuromuscular Transmission",q:"Events of Neuromuscular Transmission include:",o:["Development of miniature hyperpolarization potential","Inhibition of acetylcholine","Ca2+ combines with synaptic vesicles to release acetylcholine","The choline produced by CAT is recycled","The action of acetylcholine is terminated by CAT"],a:2},
  {id:20,s:1,t:"Smooth Muscle",q:"Relaxation in smooth muscle occurs when:",o:["Myosin phosphatase removes phosphate from myosin","Ca++ binds to calmodulin","The myosin head contracts","Ca++ channels open","Ca++ is released from the sarcoplasmic reticulum"],a:0},
  {id:21,s:1,t:"Autonomic Nervous System",q:"Norepinephrine is usually the neurotransmitter employed by:",o:["Parasympathetic preganglionic neurons","Parasympathetic postganglionic neurons","Sympathetic preganglionic neurons","Sympathetic postganglionic neurons","Parasympathetic adrenal preganglionic neurons"],a:3},
  {id:22,s:1,t:"Action Potential",q:"Depolarization:",o:["Is associated with increase in membrane permeability to Na+","Is terminated with closure of voltage activated K+ channels","Is followed by muscle relaxation","Is caused by K+ efflux","Is caused by Cl- efflux"],a:0},
  {id:23,s:1,t:"Neuromuscular Transmission",q:"Events of Neuromuscular Transmission include all of the following:",o:["Development of miniature endplate potential","Release of acetylcholine","Destruction of acetylcholine","The choline produced by ACE is recycled","All of the above"],a:4},
  {id:24,s:1,t:"Autonomic Nervous System",q:"The function of which of the following is dominated by the sympathetic nervous system?",o:["Systemic blood vessels","Heart","Gastrointestinal gland secretion","Salivary glands","Gastrointestinal motility"],a:0},
  {id:25,s:1,t:"Action Potential",q:"In propagation of Action potential:",o:["Axons conduct impulses in both directions","Axons conduct impulses in a single direction","Saltatory conduction is slower than electrotonic conduction","Electrotonic conduction is seen in myelinated fibers","Antidromic impulses are conducted through synapses"],a:1},
  {id:26,s:1,t:"Action Potential",q:"The electrical potential difference across the cell membrane under resting condition is:",o:["Fatigue","Action potential","Spike potential","Resting membrane Potential","A and C"],a:3},
  {id:27,s:1,t:"Action Potential",q:"The phase of action potential in which the muscle reverses back to the resting membrane potential is:",o:["Repolarization","Overshoot","Depolarization","Plateau","Latent Period"],a:0},
  {id:28,s:1,t:"Action Potential",q:"Which of the following would generate an Action Potential?",o:["Threshold Stimulus only","Subthreshold Stimulus","Suprathreshold Stimulus only","Threshold and Suprathreshold Stimuli","All stimuli regardless of strength"],a:3},
  {id:29,s:1,t:"Action Potential",q:"Concerning Refractory Period, the following are correct EXCEPT:",o:["In ARP the nerve does not show any response at all","In ARP, a suprathreshold stimulus can initiate a response","ARP lasts between 1-2ms","In RRP, Na channels begin to recover from inactivation","RRP does not extend through rest of repolarization"],a:1},
  {id:30,s:1,t:"Muscle Proteins",q:"The following are attachment proteins EXCEPT:",o:["Dystrophin","Titin","Troponin","Nebulin","None of the above"],a:2},
  {id:31,s:1,t:"Muscle Proteins",q:"Thin filaments are composed of the following EXCEPT:",o:["Troponin","Actin","Myosin","Tropomyosin","None of the above"],a:2},
  {id:32,s:1,t:"Muscle Physiology",q:"In the strength duration curve:",o:["Chronaxie always measures the excitability in a cell","Utilization time is shorter than Chronaxie","The shorter the chronaxie the lesser the excitability","None is correct","All of the above"],a:3},
  {id:33,s:1,t:"Neurotransmission",q:"The following are excitatory neurotransmitters EXCEPT:",o:["GABA","Noradrenaline","Dopamine","Serotonin","Acetylcholine"],a:0},
  {id:34,s:1,t:"Muscle Physiology",q:"The structural and functional unit of a skeletal muscle is:",o:["Sarcoplasm","Sarcoplasmic Reticulum","Sarcomere","Mitochondria","Sarcolemma"],a:2},
  {id:35,s:1,t:"Acetylcholine",q:"Acetylcholine is stored in the:",o:["Synaptic Cleft","Presynaptic nerve terminal","Axon cell body","Postsynaptic Muscle Cell","Axon hillock"],a:1},
  {id:36,s:1,t:"Action Potential",q:"In the structure of the nerve cell:",o:["There is sodium influx","Potassium efflux brings about repolarization","Hyperpolarizing continuation of K efflux through VG K channels even after resting potential","All of the above","None of the above"],a:3},

  // ── SECTION 2: CELL BIOLOGY, HOMEOSTASIS & TRANSPORT ─────────────────────
  {id:37,s:2,t:"Cell Biology",q:"What is the function of the glycocalyx located in the plasma membrane?",o:["Anchor cells to one another","Function as enzymes","Form channels for transport of materials","Enables cell recognition and cell-to-cell interaction","Enables cell to change shape"],a:3},
  {id:38,s:2,t:"Cell Biology",q:"The following are true about the adult human body EXCEPT:",o:["Complex control systems are required for it to live","The cell is the basic living unit","It is about 60% fluid","The most abundant cells are the neurons","Physiology studies these complex control systems"],a:3},
  {id:39,s:2,t:"Body Fluids",q:"Concerning fluid in the human body:",o:["The largest compartment is the ECF","The fluid contains only ions and water","The ECF is in constant motion throughout the body","The ECF constitutes the internal environment","C and D are true"],a:4},
  {id:40,s:2,t:"Homeostasis",q:"Claude Bernard:",o:["Coined the term homeostasis","Was a Harvard professor","Lived in the 20th century","Named the ECF, milieu intérieur","All of the above are correct"],a:3},
  {id:41,s:2,t:"Homeostasis",q:"Concerning homeostasis the following are true EXCEPT:",o:["It is the maintenance of constancy in the internal environment","Some body tissues and organs contribute to it","Deviations from set limits cause malfunctions","It is the basis of physiology","It describes changes that must take place to maintain normalcy"],a:4},
  {id:42,s:2,t:"Homeostasis",q:"The respiratory system contributes directly to homeostasis in the following ways EXCEPT:",o:["Provision of oxygen","Protection","Reproduction","Removal of metabolites","B and C"],a:2},
  {id:43,s:2,t:"Homeostasis",q:"Components of the homeostatic mechanism include the following EXCEPT:",o:["An integrating center","Effectors","Gravity","Sensors","Afferent pathways"],a:2},
  {id:44,s:2,t:"Homeostasis",q:"Concerning Feedback signals:",o:["The commonest are negative feedback","Most control systems function by negative feedback","Effectors produce the reverse of deviation in negative feedback","All of the above are correct","A and B are correct"],a:3},
  {id:45,s:2,t:"Homeostasis",q:"The following are examples of beneficial positive feedback controls EXCEPT:",o:["Labour","Blood clotting","Blood pressure control","Generation of nerve action potential","Milk let down reflex"],a:2},
  {id:46,s:2,t:"Membrane Transport",q:"In carrier mediated transport, energy is derived from:",o:["Hydrolysis of ATP","Protein metabolism","Concentration gradient","Vitamin metabolism","Water metabolism"],a:0},
  {id:47,s:2,t:"Membrane Transport",q:"Which of the following would decrease the rate of diffusion of substance across cell membrane?",o:["Increase in temperature","Increase in membrane permeability","Decrease in molecular size","Decrease in concentration gradient","Increase in concentration gradient"],a:3},
  {id:48,s:2,t:"Membrane Transport",q:"In cotransport, the solutes are transported by:",o:["Diffusion","Facilitated diffusion","Active transport","Counter transport","Altransport"],a:2},
  {id:49,s:2,t:"Membrane Transport",q:"Which one of the following is an example of transport against electrochemical gradient?",o:["Diffusion","Facilitated diffusion","Active transport","Secondary active transport","Tertiary active transport"],a:2},
  {id:50,s:2,t:"Membrane Transport",q:"The examples of secondary active transport include all EXCEPT:",o:["Sodium","Water","Chloride","Glucose","Magnesium"],a:1},
  {id:51,s:2,t:"Membrane Transport",q:"Which one of the following is NOT an example of counter transport?",o:["Na+ - Glucose","Na+ - Ca2+","HCO3- - Cl-","Na+ - K+","Ca2+ - Na+"],a:0},
  {id:52,s:2,t:"Membrane Transport",q:"Simple diffusion and facilitated diffusion share which of the following characteristics?",o:["Can be blocked by specific inhibitors","Do not require ATP","Require transport protein","Saturation kinetics","Transport solute against concentration gradient"],a:1},
  {id:53,s:2,t:"Membrane Transport",q:"Which of the following correctly describes diffusion?",o:["A form of passive transport in which water moves from higher to lower concentration","A form of active transport in which particles move from higher to lower concentration","A form of passive transport in which particles move from higher to lower concentration","A form of passive transport in which particles pass through channels","A form of active transport from lower to higher concentration"],a:2},
  {id:54,s:2,t:"Osmosis",q:"Osmotic pressure is the:",o:["Force that drives osmosis","Force that drives solutes through capillary walls","Pressure that aids in venous return","Water pressure that develops as a result of osmosis","Water pressure that develops as a result of diffusion"],a:3},
  {id:55,s:2,t:"Osmosis",q:"If red blood cells are immersed in a hypertonic solution, the cells will:",o:["Remain normal in size","Lose fluid and shrink","Swell and possibly burst","Diffuse through capillary walls","Diffuse through arterial walls"],a:1},
  {id:56,s:2,t:"Cell Biology",q:"What is the process by which large molecules can leave the cell even though they are too large to move through the plasma membrane?",o:["Exocytosis","Endocytosis","Phagocytosis","Pinocytosis","Apoptosis"],a:0},
  {id:57,s:2,t:"Membrane Transport",q:"The primary force moving water molecules from blood plasma to interstitial fluid is:",o:["Active transport","Cotransport with H+","Facilitated diffusion","Cotransport with Na+","Filtration"],a:4},
  {id:58,s:2,t:"Molecular Biology",q:"The following are incorrect of transcription EXCEPT:",o:["Making a copy of a specific DNA sequence into complementary RNA","Making a copy of a specific RNA sequence into complementary mRNA","Making a copy of a polymerase sequence into complementary RNA","Making a copy of a specific RNA sequence into complementary DNA","All of the above"],a:0},
  {id:59,s:2,t:"Membrane Transport",q:"The rate of diffusion is inversely proportional to:",o:["Surface area available for diffusion","Thickness of the membrane","Concentration gradient for the substance","Diffusion coefficient","Thickness of the object"],a:1},
  {id:60,s:2,t:"Membrane Transport",q:"Which one of the following is an example of passive transport?",o:["Calcium efflux by calcium pump","Na-Ca exchanger","Potassium efflux through potassium leak channels","Calcium sequestration in sarcoplasmic reticulum","Chloride efflux through potassium leak channels"],a:2},
  {id:61,s:2,t:"Membrane Transport",q:"Sodium potassium pump continuously pumps:",o:["Only sodium ions to inside of cells","Sodium ions inside and potassium ions outside","Chloride ions along with sodium and potassium","Only potassium ions to outside of cells","Sodium ions outside and potassium ions inside of cells"],a:4},
  {id:62,s:2,t:"Membrane Transport",q:"Facilitated diffusion is:",o:["Transport from high to low concentration that does not need energy","Transport from high to low concentration that needs energy","Active transport that needs energy","Transport from low to high concentration that does not need energy","Passive transport that needs energy"],a:0},
  {id:63,s:2,t:"Cell Signaling",q:"Cyclic AMP has all of the following properties EXCEPT:",o:["It is synthesized by phospholipase C","Stimulates the activity of a protein kinase","Can be broken down to AMP by phosphodiesterase","Is a second messenger for different hormones","Formed from ATP by adenylyl cyclase"],a:0},
  {id:64,s:2,t:"Cell Signaling",q:"The direct action of cyclic AMP in the mammalian cell is to:",o:["Activate adenylate cyclase","Activate a protein kinase","Activate a phosphodiesterase","Bind to chromatin to alter transcription","Activate a flurophosphate"],a:1},
  {id:65,s:2,t:"Cell Biology",q:"The term used to describe 'cell eating' is:",o:["Exocytosis","Phagocytosis","Pinocytosis","Diffusion","Osmosis"],a:1},
  {id:66,s:2,t:"Homeostasis",q:"What is the 'internal environment' in physiology?",o:["Cytoplasm of cells","Cytosol of cells","Internal cell organelles","Blood","Interstitial fluid"],a:4},
  {id:67,s:2,t:"Homeostasis",q:"Which of the following is INCORRECT about control systems?",o:["The body achieves homeostasis through control systems","There are two broad mechanisms of control systems","It has five components","The integrating centre is also known as control tower","There can be multiple control systems in one organ"],a:3},
  {id:68,s:2,t:"Homeostasis",q:"About the integrating centre, identify the ODD one out:",o:["It determines direction of change","It determines magnitude of change","Makes decisions","Implements a command","Sends out a command"],a:3},
  {id:69,s:2,t:"Homeostasis",q:"Not an organ system in the body:",o:["Lymphatic system","Musculoskeletal system","Hepatobiliary system","Immune system","Endocrine system"],a:2},
  {id:70,s:2,t:"Homeostasis",q:"Identify the ODD component of the feedback control system:",o:["Stimulus","Inhibitor","Response","Effector","Receptor"],a:1},
  {id:71,s:2,t:"Homeostasis",q:"Which of these best describes homeostasis?",o:["Sustenance of balance in body fluids regardless of external fluctuations","Maintenance of dynamic constancy in ECF regardless of external fluctuations","Maintenance of an unchanging internal environment","Resistance to change in body fluids","Prevention of blood loss from the internal environment"],a:1},
  {id:72,s:2,t:"Homeostasis",q:"Which of the following is an example of feedforward control in physiologic systems?",o:["Shivering in response to cold","Sweating in response to heat","Salivating at the sight and smell of food","Breathing faster due to high CO2 levels","Vasoconstriction to conserve heat"],a:2},
  {id:73,s:2,t:"Cell Biology",q:"Which is the most abundant constituent of a cell?",o:["Water","Proteins","Carbohydrates","Ions","Lipids"],a:0},
  {id:74,s:2,t:"Cell Biology",q:"Which of the following best describes the primary function of kinesin motor proteins?",o:["Transport organelles towards the minus end of microtubules","Generate contractile forces within muscle fibres","Transport organelles towards the plus end of microtubules","Assist in assembly of actin filaments","Degrade microtubules during cell division"],a:2},
  {id:75,s:2,t:"Cell Biology",q:"Which of the following is the processing, packaging, sorting and distribution centre of the cell?",o:["Mitochondrion","Endoplasmic reticulum","Golgi apparatus","Peroxisomes","Cytoskeleton"],a:2},
  {id:76,s:2,t:"Cell Signaling",q:"Concerning cell signalling, which is the BEST option?",o:["Apocrine signalling is a type","Juxtacrine and paracrine are similar","All intracellular receptors transduce through DNA interactions","Neurocrine is a subset of paracrine","Plasma membrane receptors are for lipid soluble ligands"],a:3},
  {id:77,s:2,t:"Cell Signaling",q:"The following are ligand-receptor interactions EXCEPT:",o:["Affinity","Summation","Saturation","Specificity","Competition"],a:1},
  {id:78,s:2,t:"Cell Signaling",q:"Which of the following is NOT a step in the signal transduction process?",o:["Formation of receptor-ligand complex","Signal termination","Signal inhibition","Second messenger relays information","Protein phosphorylation"],a:2},
  {id:79,s:2,t:"Osmosis",q:"What is the expected effect if a cell is placed in a hypotonic solution (membrane impermeable to solute)?",o:["Cell will shrink due to water loss","Oncotic pressure inside the cell will increase","Osmotic pressure outside the cell will increase","Cell will swell due to water gain","Osmotic pressure will equalize across the membrane"],a:3},
  {id:80,s:2,t:"Cell Signaling",q:"In signal transduction, what is the primary function of a receptor protein?",o:["Generate a cellular response","Amplify the signal","Detect the ligand","Translocate to the nucleus","Inhibit gene expression"],a:2},
  {id:81,s:2,t:"Membrane Transport",q:"Factors that determine solute flow through carrier-mediated transport include the following EXCEPT:",o:["Solute concentration","Affinity of the transporter","Number of transporters in the membrane","Rate of conformational change of the transport protein","Size of the molecules"],a:4},
  {id:82,s:2,t:"Cell Signaling",q:"Concerning endocrine signalling, having a plasma membrane receptor implies all EXCEPT:",o:["Rapid onset of action","Short duration of action","Storage in secretory vesicles","Use of 2nd messengers","Interaction with DNA"],a:4},
  {id:83,s:2,t:"Membrane Transport",q:"Which is most appropriate concerning passive transport?",o:["Brownian motion is responsible","Heat is responsible","Electrical gradient is responsible","Chemical gradient is responsible","Pressure gradient is responsible"],a:3},
  {id:84,s:2,t:"Osmosis",q:"Which best describes the primary driving force behind osmosis in biological systems?",o:["Electrical gradients across the cell membrane","Differences in hydrostatic pressure","Active transport of solutes","Concentration gradient of water","ATP hydrolysis"],a:3},

  // ── SECTION 3: BLOOD GROUPS, HEMATOLOGY & COAGULATION ────────────────────
  {id:85,s:3,t:"Blood Groups",q:"Which of the following blood types is considered the universal donor?",o:["A+","B-","AB+","O-","AB-"],a:3},
  {id:86,s:3,t:"Blood Groups",q:"Which blood type is the universal recipient?",o:["A-","O+","B+","AB+","A+"],a:3},
  {id:87,s:3,t:"Blood Groups",q:"The presence of which antigen determines whether a person's blood type is Rh-positive?",o:["A antigen","B antigen","Rh antigen","O antigen","D antigen"],a:2},
  {id:88,s:3,t:"Blood Groups",q:"Which blood type is characterized by having A antigens on RBCs and anti-B antibodies in plasma?",o:["A+","B+","AB+","O-","AB-"],a:0},
  {id:89,s:3,t:"Blood Groups",q:"What is the main reason why blood type O is considered the universal donor?",o:["It has no A or B antigens on the red blood cells","It has the Rh antigen","It has A and B antigens on RBCs","It has anti-A and anti-B antibodies in plasma","It can be given to only AB recipients"],a:0},
  {id:90,s:3,t:"Blood Groups",q:"Which blood type has B antigens on RBCs and anti-A antibodies in plasma?",o:["B-","A-","AB+","O+","B+"],a:4},
  {id:91,s:3,t:"Blood Transfusion",q:"In blood transfusion, what could cause a hemolytic reaction?",o:["Receiving type O- blood when recipient is O+","Receiving type B- blood when recipient is AB+","Receiving type A+ blood when recipient is B+","Receiving type AB- blood when recipient is A-","Receiving type O+ blood when recipient is A-"],a:2},
  {id:92,s:3,t:"Blood Groups",q:"Which blood type is the rarest in the general population?",o:["O-","AB-","B-","A+","O+"],a:1},
  {id:93,s:3,t:"Blood Groups",q:"The ABO blood group system is based on the presence or absence of which antigens?",o:["A and B antigens","Rh and D antigens","O and AB antigens","A and O antigens","B and Rh antigens"],a:0},
  {id:94,s:3,t:"Blood Groups",q:"What is the primary difference between the ABO and Rh blood group systems?",o:["ABO involves RBC antigens, Rh involves presence of Rh antigen","Rh involves only antibodies while ABO involves antigens","ABO includes only positive blood types","ABO does not affect transfusion compatibility","Rh involves antigens on white blood cells"],a:0},
  {id:95,s:3,t:"Blood Groups",q:"What is the role of the anti-Rh antibody in pregnancy?",o:["It helps the Rh-positive fetus develop properly","It prevents Rh-negative blood from mixing with Rh-positive blood","It can cause hemolytic disease of the newborn if mother is Rh-negative and fetus is Rh-positive","It aids in blood clotting during delivery","It increases risk of transfusion reactions"],a:2},
  {id:96,s:3,t:"Blood Groups",q:"If a person has type AB blood, what types of blood can they donate to?",o:["Only AB+","AB+ and AB-","All blood types","Only AB+ and A+","All positive blood types"],a:0},
  {id:97,s:3,t:"Blood Groups",q:"Which of the following blood types has the potential to produce anti-A and anti-B antibodies?",o:["AB+","A-","O-","B-","A+"],a:2},
  {id:98,s:3,t:"Blood Groups",q:"The Rh factor is inherited separately from the ABO blood group system. What does this mean?",o:["Rh status is not related to ABO blood type","Rh factor affects only A and B blood types","All AB blood types can only be Rh-positive","Rh factor can be inherited regardless of ABO type","Rh-negative individuals cannot have AB blood types"],a:3},
  {id:99,s:3,t:"Red Blood Cells",q:"What is the primary function of red blood cells?",o:["Oxygen transport","Immune response","Blood clotting","Waste removal","Hormone transport"],a:0},
  {id:100,s:3,t:"Hemoglobin",q:"Which of the following is a component of hemoglobin?",o:["Copper","Magnesium","Iron","Calcium","Zinc"],a:2},
  {id:101,s:3,t:"White Blood Cells",q:"Which blood cell type is responsible for the immune response?",o:["Erythrocytes","Leukocytes","Thrombocytes","Platelets","Hepatocytes"],a:1},
  {id:102,s:3,t:"Red Blood Cells",q:"What is the lifespan of a typical red blood cell?",o:["10 days","120 days","90 days","30 days","200 days"],a:1},
  {id:103,s:3,t:"White Blood Cells",q:"Which of the following is NOT a type of white blood cell?",o:["Neutrophil","Eosinophil","Basophil","Erythrocyte","Monocyte"],a:3},
  {id:104,s:3,t:"Blood Composition",q:"What percentage of blood is plasma?",o:["10%","25%","45%","55%","75%"],a:3},
  {id:105,s:3,t:"Blood Composition",q:"What is the main protein found in plasma?",o:["Hemoglobin","Myoglobin","Albumin","Fibrinogen","Collagen"],a:2},
  {id:106,s:3,t:"Platelets",q:"What is the role of platelets in the blood?",o:["Oxygen transport","Fight infections","Blood clotting","Transport nutrients","Maintain pH balance"],a:2},
  {id:107,s:3,t:"Coagulation",q:"Which of the following is an anticoagulant?",o:["Fibrin","Plasmin","Heparin","Thrombin","Collagen"],a:2},
  {id:108,s:3,t:"Hematology",q:"What is hematocrit?",o:["The white blood cell count","The platelet count","The percentage of plasma in blood","The percentage of red blood cells in blood","The oxygen-carrying capacity of blood"],a:3},
  {id:109,s:3,t:"Hematopoiesis",q:"Which organ is primarily responsible for the production of erythropoietin?",o:["Liver","Kidney","Bone marrow","Spleen","Pancreas"],a:1},
  {id:110,s:3,t:"Blood pH",q:"What is the normal pH range of blood?",o:["6.8 - 7.2","7.0 - 7.4","7.35 - 7.45","7.5 - 8.0","6.5 - 7.0"],a:2},
  {id:111,s:3,t:"White Blood Cells",q:"Which of the following is a granulocyte?",o:["Monocyte","Lymphocyte","Basophil","Erythrocyte","Platelet"],a:2},
  {id:112,s:3,t:"Hematology",q:"What is the condition characterized by a low red blood cell count?",o:["Leukemia","Thrombocytopenia","Anemia","Polycythemia","Hemophilia"],a:2},
  {id:113,s:3,t:"Coagulation",q:"Which of the following vitamins is essential for blood clotting?",o:["Vitamin A","Vitamin C","Vitamin D","Vitamin K","Vitamin B12"],a:3},
  {id:114,s:3,t:"Hematopoiesis",q:"Where does hematopoiesis primarily occur in adults?",o:["Liver","Spleen","Bone marrow","Thymus","Lymph nodes"],a:2},
  {id:115,s:3,t:"Blood Groups",q:"Which blood type has neither A nor B antigens?",o:["Type A","Type B","Type AB","Type O","Type Rh-positive"],a:3},
  {id:116,s:3,t:"Blood Composition",q:"What is the major cation found in plasma?",o:["Sodium","Potassium","Calcium","Magnesium","Iron"],a:0},
  {id:117,s:3,t:"Hematopoiesis",q:"Which hormone is responsible for stimulating red blood cell production?",o:["Insulin","Erythropoietin","Thyroxine","Glucagon","Cortisol"],a:1},
  {id:118,s:3,t:"White Blood Cells",q:"Which type of leukocyte is most abundant in human blood?",o:["Basophils","Lymphocytes","Monocytes","Eosinophils","Neutrophils"],a:4},
  {id:119,s:3,t:"Coagulation",q:"Which of the following factors is NOT part of the intrinsic pathway?",o:["Factor XII","Factor IX","Factor VIII","Factor VII","Factor XI"],a:3},
  {id:120,s:3,t:"Coagulation",q:"Which laboratory test is most directly affected by Factor VIII deficiency?",o:["Prothrombin Time (PT)","Activated Partial Thromboplastin Time (aPTT)","Thrombin Time (TT)","Fibrinogen Level","Platelet Count"],a:1},
  {id:121,s:3,t:"Coagulation",q:"What is the primary role of von Willebrand Factor (vWF) in hemostasis?",o:["To convert fibrinogen to fibrin","To activate Factor X","To stabilize Factor II","To bind and stabilize Factor VIII","To promote platelet aggregation"],a:3},
  {id:122,s:3,t:"Coagulation",q:"In the context of hemostasis, what is the role of thrombin in platelet activation?",o:["Thrombin inhibits platelet activation by degrading receptors","Thrombin binds to platelet receptors and promotes platelet activation and aggregation","Thrombin converts fibrinogen to fibrin but has no effect on platelets","Thrombin is primarily involved in fibrinolysis","Thrombin neutralizes platelet activating factors"],a:1},
  {id:123,s:3,t:"Coagulation",q:"Which factor is NOT involved in the common pathway of coagulation?",o:["Factor V","Factor X","Factor VII","Factor II","Factor I"],a:2},
  {id:124,s:3,t:"Coagulation",q:"In which bleeding disorder is platelet aggregation typically normal but platelet count reduced?",o:["Glanzmann thrombasthenia","Bernard-Soulier syndrome","Thrombotic Thrombocytopenic Purpura (TTP)","Immune Thrombocytopenic Purpura (ITP)","Hemophilia A"],a:3},
  {id:125,s:3,t:"Coagulation",q:"What is the effect of Tissue Factor Pathway Inhibitor (TFPI)?",o:["TFPI activates Factor X","TFPI inhibits the tissue factor-Factor VIIa complex","TFPI degrades fibrinogen","TFPI enhances prothrombin to thrombin conversion","TFPI stabilizes Factor V"],a:1},
  {id:126,s:3,t:"Coagulation",q:"Which coagulation factor is most directly involved in cross-linking fibrin strands?",o:["Factor XIII","Factor V","Factor II","Factor VII","Factor IX"],a:0},
  {id:127,s:3,t:"Coagulation",q:"Which molecule is essential for the conversion of fibrinogen to fibrin?",o:["Prothrombin","Thrombin","Plasmin","Heparin","Vitamin K"],a:1},
  {id:128,s:3,t:"Hematology",q:"What condition is characterized by an abnormally high white blood cell count?",o:["Anemia","Leukopenia","Leukocytosis","Thrombocytosis","Polycythemia"],a:2},
  {id:129,s:3,t:"White Blood Cells",q:"What is the primary function of eosinophils?",o:["Phagocytosis","Antibody production","Parasitic defense","Blood clotting","Oxygen transport"],a:2},
  {id:130,s:3,t:"Hematology",q:"Which organ stores and filters red blood cells and platelets?",o:["Liver","Kidney","Spleen","Thymus","Bone marrow"],a:2},
  {id:131,s:3,t:"Hematology",q:"What blood disorder is characterized by excessive production of red blood cells?",o:["Leukemia","Thalassemia","Polycythemia vera","Anemia","Hemophilia"],a:2},
  {id:132,s:3,t:"Blood Composition",q:"Which plasma protein plays a key role in the immune response by binding to antigens?",o:["Albumin","Globulin","Fibrinogen","Hemoglobin","Myoglobin"],a:1},
  {id:133,s:3,t:"Coagulation",q:"What triggers the intrinsic pathway of the coagulation cascade?",o:["Tissue damage","Blood vessel injury","Exposure to collagen","Exposure to lipids","Platelet aggregation"],a:2},
  {id:134,s:3,t:"Blood Composition",q:"What is the primary role of albumin in the blood?",o:["Oxygen transport","Immune response","Maintaining osmotic pressure","Blood clotting","Hormone transport"],a:2},
  {id:135,s:3,t:"Cell Biology",q:"Identify the odd one out in protein synthesis:",o:["Lysosomes","Ribosomes","Rough endoplasmic reticulum","Nucleus","Golgi apparatus"],a:0},

  // ── SECTION 4: RESPIRATORY PHYSIOLOGY ────────────────────────────────────
  {id:136,s:4,t:"Respiratory Physiology",q:"What does the term 'dead space' refer to in respiratory physiology?",o:["Volume of air that reaches the alveoli for gas exchange","Volume of air that does not participate in gas exchange","Volume of air that can be forcibly exhaled after normal expiration","The total lung capacity","Amount of air remaining after maximal expiration"],a:1},
  {id:137,s:4,t:"Respiratory Physiology",q:"In which part of the respiratory system does gas exchange primarily occur?",o:["Bronchi","Trachea","Alveoli","Larynx","Nasal cavity"],a:2},
  {id:138,s:4,t:"Respiratory Physiology",q:"What is the effect of hyperventilation on blood CO2 levels?",o:["Increases CO2 levels","Decreases CO2 levels","No change in CO2 levels","Increases O2 levels","Decreases O2 levels"],a:1},
  {id:139,s:4,t:"Respiratory Physiology",q:"What is the primary function of surfactant in the alveoli?",o:["To increase surface tension","To decrease surface tension","To facilitate gas exchange","To prevent infection","To assist in contraction of the diaphragm"],a:1},
  {id:140,s:4,t:"Respiratory Physiology",q:"Which of the following is the most important factor in determining the direction of gas diffusion?",o:["Temperature","Humidity","Partial pressure gradient","Solubility in water","Molecular weight"],a:2},
  {id:141,s:4,t:"Respiratory Physiology",q:"The majority of carbon dioxide in the blood is transported as:",o:["Dissolved CO2","Carbaminohemoglobin","Carbonic acid","Bicarbonate ions","Hemoglobin-bound CO2"],a:3},
  {id:142,s:4,t:"Respiratory Physiology",q:"What effect does an increase in altitude have on oxygen availability?",o:["Increases partial pressure of oxygen","Decreases partial pressure of oxygen","Increases solubility of oxygen in blood","Has no effect on oxygen availability","Increases oxygen uptake in lungs"],a:1},
  {id:143,s:4,t:"Respiratory Physiology",q:"Which structure in the respiratory system is primarily responsible for sound production?",o:["Trachea","Bronchi","Larynx","Pharynx","Alveoli"],a:2},
  {id:144,s:4,t:"Respiratory Physiology",q:"The process of moving air into and out of the lungs is called:",o:["Respiration","Ventilation","Diffusion","Perfusion","Osmosis"],a:1},
  {id:145,s:4,t:"Respiratory Physiology",q:"During inspiration, which muscles are primarily involved in expanding the thoracic cavity?",o:["Abdominal muscles","Intercostal muscles","Diaphragm","Scalenes","Both intercostal muscles and diaphragm"],a:2},
  {id:146,s:4,t:"Respiratory Physiology",q:"What is the primary drive for breathing in healthy individuals?",o:["Low oxygen levels","High carbon dioxide levels","Low blood pH","High blood pH","High oxygen levels"],a:1},
  {id:147,s:4,t:"Respiratory Physiology",q:"What is the typical tidal volume in a healthy adult at rest?",o:["100 mL","200 mL","500 mL","1 L","2 L"],a:2},
  {id:148,s:4,t:"Respiratory Physiology",q:"The term 'dead space' refers to:",o:["Volume of air that reaches the alveoli","Volume of air that is ventilated but not perfused","Volume of air that cannot be exhaled","Volume of air left in lungs after maximum exhalation","Volume of air remaining after a normal breath"],a:1},
  {id:149,s:4,t:"Respiratory Physiology",q:"Which of the following is NOT a primary function of the respiratory system?",o:["Gas exchange","Regulation of blood pH","Protection against pathogens","Regulation of body temperature","Production of hormones"],a:4},
  {id:150,s:4,t:"Respiratory Physiology",q:"What is the role of the respiratory mucosa?",o:["To increase gas exchange","To produce surfactant","To trap and remove particulates from inhaled air","To regulate airflow","To aid in vocalization"],a:2},
  {id:151,s:4,t:"Respiratory Physiology",q:"Which of the following is a component of the external respiration process?",o:["Gas exchange between blood and tissues","Gas exchange between alveoli and blood","Cellular respiration","Ventilation of alveoli","None of the above"],a:1},
  {id:152,s:4,t:"Respiratory Physiology",q:"What is the primary form of oxygen transport in the blood?",o:["Dissolved in plasma","Bound to hemoglobin","As bicarbonate ions","As carbonic acid","Bound to albumin"],a:1},
  {id:153,s:4,t:"Respiratory Physiology",q:"The Hering-Breuer reflex helps regulate:",o:["Blood pH","Oxygen levels in the blood","Depth of breathing","Rate of breathing","Body temperature"],a:2},
  {id:154,s:4,t:"Respiratory Physiology",q:"Which gas law explains the relationship between partial pressures of gases and their solubility in liquid?",o:["Boyle's Law","Charles's Law","Dalton's Law","Henry's Law","Graham's Law"],a:3},
  {id:155,s:4,t:"Respiratory Physiology",q:"The term 'tidal volume' refers to:",o:["Maximum air exhaled after maximal inhalation","Volume of air inhaled or exhaled in a normal breath","Total volume of air in lungs after maximal inhalation","Volume of air remaining after maximal exhalation","Air that can be forcibly inhaled after a normal inhalation"],a:1},
  {id:156,s:4,t:"Respiratory Physiology",q:"Which part of the brainstem controls the basic rhythm of breathing?",o:["Medulla oblongata","Pons","Thalamus","Hypothalamus","Cerebellum"],a:0},
  {id:157,s:4,t:"Respiratory Physiology",q:"Which of the following is a factor that increases the rate of diffusion of gases in the lungs?",o:["Increased thickness of the respiratory membrane","Decreased surface area of the alveoli","Increased partial pressure gradient","Decreased alveolar ventilation","Decreased blood flow in pulmonary capillaries"],a:2},
  {id:158,s:4,t:"Respiratory Physiology",q:"Which of the following factors does NOT directly affect pulmonary ventilation mechanics?",o:["Lung compliance","Airway resistance","Atmospheric pressure","Blood pH","Chest wall elasticity"],a:3},
  {id:159,s:4,t:"Respiratory Physiology",q:"The primary method of carbon dioxide transport in the blood is:",o:["Bound to hemoglobin","Dissolved in plasma","As bicarbonate ions (HCO3-)","As carbonic acid (H2CO3)","Bound to albumin"],a:2},
  {id:160,s:4,t:"Respiratory Physiology",q:"Which of the following is NOT a primary function of the respiratory system?",o:["Gas exchange","Regulation of blood pH","Protection against pathogens","Regulation of body temperature","Reproduction"],a:4},
  // ── PDF 1: FECAMDS PRETEST 100 QUESTIONS ──────────────────────────────────
  {id:201,s:2,t:"History of Physiology",q:"The father of contemporary physiology is:",o:["Arthur Guyton","Walter Cannon","Claude Bernard","Gabriel Ezeilo","Eghosa Iyare"],a:2},
  {id:202,s:2,t:"Homeostasis",q:"Carefully coordinated physiological processes that ensure regulation of the internal environment is best referred to as:",o:["Feedforward mechanism","Feedback mechanism","Homeostasis","Control System","Milieu intérieur"],a:2},
  {id:203,s:2,t:"Body Fluids",q:"The internal environment refers to the following EXCEPT:",o:["Intracellular fluid","Extracellular fluid","Interstitial fluid","Transcellular fluid","Blood plasma"],a:0},
  {id:204,s:2,t:"Homeostasis",q:"As regards positive feedback mechanism, the odd one out is:",o:["Generation of action potential","Control of cell function by the gene","Luteinizing Hormone (LH) surge","Parturition","Milk ejection reflex"],a:1},
  {id:205,s:2,t:"Homeostasis",q:"As regards negative feedback mechanisms, the odd option is:",o:["Blood clotting","Control of blood glucose level","Blood pressure regulation","Body temperature regulation","Control of pulmonary ventilation"],a:0},
  {id:206,s:2,t:"Homeostasis",q:"As regards body temperature regulation, which is the odd option?",o:["Metabolic activities","Muscular activities","Thyroxine secretion","Shivering","Panting"],a:4},
  {id:207,s:2,t:"Body Fluids",q:"Which is correct about the human body?",o:["Red blood cells number 25 billion","60% of the adult human body is fluid","Half of the total body water is within the cells","The ECF has higher concentrations of K+","The ECF has lower concentrations of bicarbonate ions"],a:1},
  {id:208,s:2,t:"Cell Signaling",q:"The type of cellular signaling where chemical mediators are released into the environment is:",o:["Paracrine","Autocrine","Pheromones","Neuronal","Neuro-endocrine"],a:2},
  {id:209,s:2,t:"History of Physiology",q:"The concept of Control Systems was postulated by:",o:["Arthur Guyton","Walter Cannon","Claude Bernard","Gabriel Ezeilo","Eghosa Iyare"],a:0},
  {id:210,s:2,t:"Cell Biology",q:"The cell theory is not applicable to:",o:["Bacteria","Algae","Virus","Fungi","Egg"],a:2},
  {id:211,s:2,t:"Body Fluids",q:"Extracellular fluid contains large amount of:",o:["Potassium","Magnesium","Phosphate","Chloride","Zinc"],a:3},
  {id:212,s:2,t:"Cell Biology",q:"Microfilaments are composed of a protein called:",o:["Actin","Tubulin","Myosin","Chitin","Elastin"],a:0},
  {id:213,s:2,t:"Cell Biology",q:"Smooth endoplasmic reticulum is the site of:",o:["Protein synthesis","Carbohydrate synthesis","Amino acid synthesis","Lipid synthesis","Glycoprotein packaging"],a:3},
  {id:214,s:2,t:"History of Physiology",q:"The following French Physiologist made remarkable input in the development of Physiology:",o:["Arthur Guyton","Walter Cannon","Claude Bernard","Gabriel Ezeilo","Chloé Louis"],a:2},
  {id:215,s:2,t:"Body Fluids",q:"About the human body, which is correct?",o:["Obesity correlates with lower water content","Electrolytes provide organic elements for chemical reactions","Carbohydrates make up 15% of body cells","The cellular nucleus is a component of the cytosol","Glucose is fat soluble"],a:0},
  {id:216,s:2,t:"Cell Biology",q:"Which is NOT correct about cellular physiology?",o:["Cholesterol determines membrane fluidity","Cellular membrane is 7.5–10 nanometers thick","The peripheral proteins serve as structural channels for substances","Some integral proteins serve as enzymes","Membrane carbohydrates have a negative charge"],a:2},
  {id:217,s:2,t:"Cell Biology",q:"Which is NOT correctly matched?",o:["Lysosomes: garbage system of the cell","Lysosomes: bi-layered","Smooth ER: protein synthesis","Smooth ER: storage of calcium","Peroxisomes: fatty acid catabolism"],a:2},
  {id:218,s:2,t:"Cell Biology",q:"About the mitochondria, which is correct?",o:["Called the powerhouse of the cell","Is rich in RNA","Inner matrix contains two enzymes for ATP production","Has doubled layer outer membrane","All are correct"],a:0},
  {id:219,s:2,t:"Cell Biology",q:"Concerning endoplasmic reticulum:",o:["Involved in glycogen breakdown only","Helps in drug detoxification only","There is conjugation with glucuronic acid only","Only A and B are correct","All of the above"],a:4},
  {id:220,s:2,t:"Cell Biology",q:"The mammalian cell membrane:",o:["Is seen as an optically dense line using light microscopy","Consists mainly of protein","Does not contain enzymes","Is more permeable to fat- than to water-soluble particles","Contains receptors for steroid hormones"],a:3},
  {id:221,s:2,t:"Cell Biology",q:"Which is NOT correct about the endoplasmic reticulum?",o:["Is a complex system of intracellular tubules","Is a component of the Golgi apparatus","Has a membrane structure similar to the cell membrane","Is associated with ribonucleoprotein","Is well developed in secretory cells"],a:1},
  {id:222,s:2,t:"Cell Biology",q:"The site of protein synthesis is:",o:["Endoplasmic reticulum","Ribosomes","Mitochondria","Nucleus","Golgi apparatus"],a:1},
  {id:223,s:2,t:"Body Fluids",q:"The principal extracellular cation is:",o:["Sodium (Na+)","Potassium (K+)","Chloride (Cl-)","Calcium (Ca2+)","Magnesium (Mg2+)"],a:0},
  {id:224,s:2,t:"Body Fluids",q:"The principal intracellular cation is:",o:["Na+","K+","Cl-","Ca2+","Mg2+"],a:1},
  {id:225,s:2,t:"Cell Biology",q:"Select the structure NOT located in the cytosol of the cell:",o:["Endoplasmic reticulum","Golgi complex","Lysosome","Mitochondrion","Nucleolus"],a:4},
  {id:226,s:2,t:"Cell Biology",q:"Phagocytosed food is digested with help of enzymes present in:",o:["Ribosome","Lysosomes","Mitochondria","Golgi complex","Endoplasmic reticulum"],a:1},
  {id:227,s:2,t:"Cell Biology",q:"The nucleolus is a small, dense body composed mainly of:",o:["Chromatin","DNA","RNA","Cytoplasm","Endoplasm"],a:2},
  {id:228,s:2,t:"Cell Biology",q:"Which is NOT correct about Lysosomes?",o:["Are membrane-bound organelles in the cytoplasm","Contain enzymes known as lysozyme","Are not present in serous salivary glands","Enable neutrophils to digest phagocytosed material","Can digest cellular contents"],a:1},
  {id:229,s:2,t:"Cell Biology",q:"About cellular physiology, which is NOT correctly matched?",o:["Largest organelle: nucleus","Nucleolus: single membrane","Lysosomes: Lysoferrin","Lysosomes: autolysis","Golgi apparatus: carbohydrate formation"],a:1},
  {id:230,s:2,t:"Membrane Transport",q:"All of the following transport processes are passive EXCEPT:",o:["Diffusion","Facilitated diffusion","Osmosis","Vesicular transport","None of the above"],a:3},
  {id:231,s:2,t:"Body Fluids",q:"Compared to the extracellular fluid, cytosol contains:",o:["Almost no lipids","A lower concentration of dissolved proteins","A higher concentration of potassium ions","An increased concentration of amino acids","Almost no glycogen"],a:2},
  {id:232,s:1,t:"Nerve Fibres",q:"Which is NOT correct as regards neurons?",o:["A fibres are non-myelinated","C fibres are non-myelinated","B fibres are myelinated","C fibres are most susceptible to local anaesthetics","C fibres are least susceptible to pressure"],a:0},
  {id:233,s:1,t:"Nerve Fibres",q:"As regards numerical classification of nerve fibres, which is correctly matched?",o:["Ia: pain, cold and touch receptors","Ib: pain, temperature and other receptors","II: muscle spindle – flower spray ending","III: muscle spindle – annulospiral ending","IV: Golgi tendon organ"],a:2},
  {id:234,s:1,t:"Action Potential",q:"About membrane potentials, which is correct?",o:["Separation of charges across cell membrane has limited role","At rest, cell membrane is highly permeable to K+","At rest, cell membrane is moderately permeable to bicarbonate","At rest, cell membrane is least permeable to Na+","RMP is equal to equilibrium potential for K+"],a:1},
  {id:235,s:1,t:"Action Potential",q:"Which is NOT a determinant of membrane potential?",o:["Concentration of charges across cell membrane","Presence of sodium leak channels","Permeability of cell membrane to ions","Activity of electrogenic pumps","Presence of clathrin on cell membrane"],a:4},
  {id:236,s:1,t:"Action Potential",q:"About resting membrane potential, which is correct?",o:["K+ efflux contributes little to RMP","K+ influx contributes greatly to RMP","Applying positive charge to the inside of the cell could arrest movement of K+","Movement of other ions makes RMP not equal to equilibrium potential for K+","The negative sign represents a mathematical expression"],a:2},
  {id:237,s:1,t:"Action Potential",q:"About membrane potentials, which is correct?",o:["A cell with -90mV has lower RMP than a cell with -80mV","A cell with -90mV has higher RMP than a cell with -80mV","RMP for all cells is -90mV","Na-K ATPase has 3 binding sites for K+","Extracellular method is preferred for RMP measurement"],a:1},
  {id:238,s:1,t:"Action Potential",q:"About membrane potentials, which is correct?",o:["Na-K ATPase has 3 binding sites for K+","Na-K ATPase has 2 binding sites for Na+","Simple diffusion is referred to as the battery","Simple diffusion is referred to as the battery charger","Active transport is referred to as the battery"],a:4},
  {id:239,s:1,t:"Action Potential",q:"As regards membrane potentials (MP), which is correct?",o:["AP is a prerequisite for all excitable cells","AP is the brief negative change in MP when a cell is stimulated","Intracellular method of measurement gives the time course of AP","Biphasic readings are obtained from intracellular method","Monophasic readings are obtained from extracellular method"],a:2},
  {id:240,s:2,t:"Cell Biology",q:"The jelly-like interior of the cell is called the:",o:["Vacuole","Cytoplasm","Cytoskeleton","Nucleus","Cellular matrix"],a:1},
  {id:241,s:3,t:"Hemoglobin",q:"Haemoglobin A is composed of:",o:["2 alpha and 2 beta chains","2 beta and 2 delta chains","2 delta and 2 gamma chains","2 gamma and 2 alpha chains","2 beta and 2 gamma chains"],a:0},
  {id:242,s:3,t:"Hemoglobin",q:"About haemoglobin S, which is correct?",o:["Valine is substituted for glutamic acid on the beta chain","Valine is substituted for glutamic acid on the alpha chain","Glutamic acid is substituted for valine on the beta chain","Glutamic acid is substituted for valine on the alpha chain","Valine is substituted for glutamic acid on the gamma chain"],a:0},
  {id:243,s:3,t:"White Blood Cells",q:"About morphological classification of WBCs, which is correct?",o:["Granulocytes are composed of monocytes and lymphocytes","Eosinophils are types of agranulocytes","Names are derived from staining granules with acetic acid","Granulocytes are often referred to as polymorphonuclear leucocytes","Granulocytes have no granules in their cytoplasm"],a:3},
  {id:244,s:3,t:"Coagulation",q:"The following are correctly matched EXCEPT:",o:["Factor II — Prothrombin","Factor III — Tissue factor","Factor IV — calcium ion","Factor X — Stuart factor","Factor VIII — Christmas factor"],a:4},
  {id:245,s:3,t:"Coagulation",q:"Which of the following vitamins is important in the synthesis of clotting factors?",o:["Vitamin A","Vitamin B","Vitamin K","Vitamin C","Vitamin D"],a:2},
  {id:246,s:3,t:"Coagulation",q:"Haemophilia A, the most common inherited coagulation disorder, is due to lack of:",o:["Factor I","Factor III","Factor VIII","Factor VII","Factor X"],a:2},
  {id:247,s:3,t:"Hematopoiesis",q:"The major site of erythropoietin production is the:",o:["Kidneys","Liver","Lymph nodes","Spleen","Bone marrow"],a:0},
  {id:248,s:3,t:"Hematology",q:"Which of the following is implicated in megaloblastic anemia?",o:["Vitamin B2","Vitamin B6","Vitamin B12","Vitamin B3","Vitamin C"],a:2},
  {id:249,s:3,t:"Hematology",q:"Lack of functioning bone marrow most commonly leads to which anemia?",o:["Haemorrhagic anemia","Aplastic anemia","Pernicious anemia","Hemolytic anemia","Megaloblastic anemia"],a:1},
  {id:250,s:3,t:"Hematology",q:"An increase in red blood cell count above the normal for age and sex is known as:",o:["Porphyrias","Polycythemia","Anemia of unknown origin","Sideroblastic anemia","Thalassemia B"],a:1},
  {id:251,s:3,t:"Hematology",q:"Westergren and Wintrobe methods are used for calculating:",o:["Packed cell volume","Haematocrit","Erythrocyte sedimentation rate","Erythropoietin level","Mean cell volume"],a:2},
  {id:252,s:3,t:"Platelets",q:"The average half life of platelets in the blood circulation is about:",o:["4-6 days","8-12 days","1 month","120 days","21 days"],a:0},
  {id:253,s:3,t:"Coagulation",q:"The enzyme that catalyses the conversion of fibrinogen to fibrin is:",o:["Thrombin","Prothrombin","Fibrinogen activator","Ionic calcium","Vitamin K"],a:0},
  {id:254,s:3,t:"Coagulation",q:"The clear fluid expressed from blood left to stand after coagulation is known as:",o:["Plasma","Serum","Packed cells","Sediments","Blood Supernatant"],a:1},
  {id:255,s:3,t:"Platelets",q:"A decrease in platelet function AND an increase in platelet number is referred to as RESPECTIVELY:",o:["Thrombasthenia and thrombocytosis","Thrombocytopenia and thrombocytosis","Thrombocytosis and thrombasthenia","Leucopenia and leucocytosis","Hemolysis and anemia"],a:0},
  {id:256,s:3,t:"Immunology",q:"Which of the following immunoglobulins is first produced in a primary response to an antigen?",o:["IgE","IgM","IgD","IgA","IgG"],a:1},
  {id:257,s:3,t:"Immunology",q:"The class of antibodies usually associated with hypersensitivity reactions is:",o:["IgA","IgD","IgM","IgG","IgE"],a:4},
  {id:258,s:3,t:"Blood Groups",q:"Which of the following is correct concerning the ABO system?",o:["AB blood group contains A and B antibodies","B blood group can donate group B and O","Group O is also known as universal recipient","Blood group O contains A and B antigens","Blood group O is also known as universal donor"],a:4},
  {id:259,s:3,t:"Hemoglobin",q:"The characteristic bright or dark red colour of blood mostly depends on:",o:["Oxygenation","Viscosity","Age and Sex","Nutritional deficiencies","Weight and Height"],a:0},
  {id:260,s:3,t:"Blood Composition",q:"The major constituent of plasma is:",o:["Water","Plasma proteins","Electrolytes","Organic wastes","Gases"],a:0},
  {id:261,s:3,t:"Coagulation",q:"Which of the following clotting factors is NOT vitamin K dependent?",o:["Factor II","Factor III","Factor VII","Factor IX","Factor X"],a:1},
  {id:262,s:3,t:"Hematopoiesis",q:"In adults, haematopoiesis occurs MAINLY in which of the following?",o:["Kidney and spleen","Liver and spleen","Marrow of femur and tibia","Marrow of membranous bones like vertebrae, sternum and ribs","Lymph nodes and yolk sac"],a:3},
  {id:263,s:3,t:"Hematopoiesis",q:"The situation whereby the liver or spleen may resume haematopoietic functions in an adult is referred to as:",o:["Myeloid haematopoiesis","Extra-uterine haematopoiesis","Extra-medullary haematopoiesis","Intra-uterine haematopoiesis","Mesoblastic haematopoiesis"],a:2},
  {id:264,s:3,t:"Blood Composition",q:"Which of the following is correct?",o:["Serum = Plasma – fibrinogen","Serum = Plasma + fibrinogen","Serum = Plasma + Christmas factor","Plasma = Serum – fibrinogen","Serum = Plasma + labile factor"],a:0},
  {id:265,s:3,t:"Hematology",q:"The thin creamy layer known as the buffy coat in centrifuged blood is composed of:",o:["WBCs only","Platelets only","WBCs and platelets","Red blood cells","Blood plasma"],a:2},
  {id:266,s:3,t:"Hematology",q:"The percentage volume of red blood cells in a sample of blood is referred to as:",o:["Mean cell volume","Hematocrit","Mean corpuscular hemoglobin concentration","Red cell count","Hemoglobin concentration"],a:1},
  {id:267,s:3,t:"Coagulation",q:"The extrinsic pathway is triggered by the release of:",o:["Tissue thromboplastin","Factor VII","Factor IX","Factor X","Tissue pathway factor inhibitor"],a:0},
  {id:268,s:3,t:"Coagulation",q:"The estimated clotting time is about:",o:["3 to 8 minutes","3 to 8 seconds","3 to 8 hours","3 to 8 days","3 to 8 weeks"],a:0},
  {id:269,s:3,t:"Coagulation",q:"Which of the following is INCORRECT about haemophilia?",o:["It is a sex linked inherited disease","Males are carriers while females are sufferers","The gene responsible is a recessive gene","The gene is present on the X chromosome","It occurs due to lack of prothrombin activator"],a:1},
  {id:270,s:3,t:"Coagulation",q:"Which of the following is deficient in hemophilia A?",o:["Factor II","Factor III","Factor V","Factor VIII","Factor VII"],a:3},
  {id:271,s:3,t:"Hematology",q:"In the clinical condition known as purpura, which of the following is MOST correct?",o:["The bleeding time is prolonged","The clotting time is normal","The bleeding time is normal","The clotting time is prolonged","Options A and B are correct"],a:4},
  {id:272,s:3,t:"Immunology",q:"The following are various barriers found in innate immunity EXCEPT:",o:["Physical barriers","Physiological barriers","Cellular barriers","Cytokine barriers","Memory barriers"],a:4},
  {id:273,s:3,t:"Immunology",q:"The predominant antibody class in body secretions and first line of defence against infections is:",o:["IgM","IgD","IgA","IgE","IgG"],a:2},
  {id:274,s:3,t:"Immunology",q:"Which one of the following is the most abundant group of T cells?",o:["Helper T cells","Cytotoxic T cells","Killer T cells","Memory T cells","Suppressor T cells"],a:0},
  {id:275,s:3,t:"Immunology",q:"The group of T cells accredited with regulatory functions of other immune system cells is the:",o:["Suppressor T cells","Helper T cells","Memory T cells","Killer T cells","Cytotoxic T cells"],a:0},
  {id:276,s:3,t:"Immunology",q:"The process through which leucocytes squeeze through narrow blood vessels into tissues is:",o:["Diffusion","Diapedesis","Osmosis","Chemotaxis","Phagocytosis"],a:1},
  {id:277,s:3,t:"Immunology",q:"Inflammation is usually characterized by the following EXCEPT:",o:["Vasodilation of local blood vessels","Increased permeability of capillaries","Swelling of tissue cells","Migration of granulocytes and monocytes into the tissue","Decreased permeability of surrounding capillaries"],a:4},
  {id:278,s:3,t:"Immunology",q:"The first line of defence against infection/inflammation is:",o:["Tissue macrophages","Neutrophil invasion of the inflamed area","Second macrophage invasion","Increased production of granulocytes and monocytes","Neutrophilia"],a:0},
  {id:279,s:3,t:"Hematology",q:"About leukaemias, which of the following is FALSE?",o:["Usually caused by uncontrolled production of WBCs by cancerous mutations","Increased number of abnormal WBCs in circulating blood","Lymphocytic and myelogenous leukaemias are general types","Severe anaemia and bleeding tendency are common effects","Usually characterized by thrombocytosis"],a:4},
  {id:280,s:3,t:"Blood Groups",q:"Hemolytic disease of the newborn mostly occurs when:",o:["The mother is Rh-negative and the father is Rh-positive","The father is Rh-negative and the mother is Rh-positive","Both mother and father are Rh-negative","Both mother and father are Rh-positive","The mother is Rh-negative and newborn is Rh-negative"],a:0},
  {id:281,s:1,t:"Nerve Fibres",q:"Which of the following concerning nerve fibres is incorrect?",o:["Node of Ranvier is about 1µm wide","Myelin is secreted by oligodendrocytes in CNS","AP is generated in the initial segment in motor nerve","Nerves are functionally divided into 3 important zones","Dendrites serve integratory functions"],a:3},
  {id:282,s:1,t:"Nerve Fibres",q:"In classification of nerve fibres, which is correct?",o:["A fibres are most responsive to pressure","C fibres are least susceptible to anaesthetic agents","C fibres have the shortest spike duration","C fibres have the fastest conduction velocity","Aδ fibres serve as motor to muscle spindle"],a:0},
  {id:283,s:1,t:"Action Potential",q:"Concerning membrane potentials, which is correct?",o:["Depolarization phase of AP is caused by Na influx in all cells","AV node has RMP of about -10mV","Peak potential in smooth muscle is less than skeletal muscle","Increasing external Na+ increases the size of AP","Decreasing ECF Ca2+ increases excitability in cells"],a:4},
  {id:284,s:1,t:"Action Potential",q:"During Resting Membrane Potential, which is correct?",o:["The cell membrane is equally permeable to Na+ and Cl-","Membrane potential is almost equal to ENa+","Active transport does not contribute to the process","There are more cations inside the cell","RMP is a prerequisite for all excitable cells"],a:4},
  {id:285,s:1,t:"Action Potential",q:"Concerning stimulus response characteristics, which is correct?",o:["The longer the chronaxie, the more excitable the cell","Slowly depolarizing stimuli require less depolarization to generate AP","Utilization time is inversely related to excitability","All of the above","None of the above"],a:4},
  {id:286,s:1,t:"Neuromuscular Transmission",q:"In neuromuscular transmission, which is correct?",o:["Synaptic cleft is about 30-50nm wide","EPP is always above threshold in all individuals","Acetyl transferase breaks down acetylcholine at NMJ","mEPP is a multiple of EPP","Amplitude of EPP can be increased by diisopropyl fluorophosphate"],a:1},
  {id:287,s:1,t:"Muscle Physiology",q:"Concerning skeletal muscle, which is correct?",o:["Troponin has a molecular weight of 43,000","I-band is anisotropic to polarized light","The size of A-band shortens during muscle contraction","I-band contains both actin and myosin filaments","Contracture is produced by continuous stimulation of the muscle"],a:4},
  {id:288,s:1,t:"Muscle Physiology",q:"Which of the following is incorrect?",o:["The length of the muscle reduces when it does negative work","Slow muscles have short twitch duration","White muscles are used for gross sustained movement","Velocity of contraction varies directly with the load on the muscle","Staircase effect may be due to increased availability of Ca2+ for troponin-C"],a:4},
  {id:289,s:1,t:"Nerve Fibres",q:"Concerning B fibres, which is correct?",o:["They have diameter of 3-6mm","They have conduction velocity of 15-30m/s","They have spike duration of 1.2ms","They are postganglionic autonomic fibres","All of the above"],a:2},
  {id:290,s:1,t:"Nerve Fibres",q:"Neurotrophins are involved in the following EXCEPT:",o:["Growth of neurons","Survival of neurons","Production of proteins","Functions of neurons","None of the above"],a:4},
  {id:291,s:3,t:"Immunology",q:"Physiological barriers include:",o:["Vaginal secretion","Nasal hair","Lysozymes in secretions","Bile","All of the above"],a:4},
  {id:292,s:3,t:"Immunology",q:"Characteristics of acquired immunity include:",o:["Memory","Diversity","Specificity","None of the above","All of the above"],a:4},
  {id:293,s:3,t:"Immunology",q:"Immunoglobulin G:",o:["Has 3 isotypes","Crosses the placenta","Provides defence against parasites","Is the first antibody produced by the fetus","Facilitates recanalization of thrombosed veins"],a:1},
  {id:294,s:3,t:"Immunology",q:"The class of antibody found in breast milk is:",o:["Immunoglobulin A","Immunoglobulin D","Immunoglobulin E","Immunoglobulin G","Immunoglobulin M"],a:0},
  {id:295,s:3,t:"Immunology",q:"In passive immunity:",o:["There is activation of the immune system","Immune system develops over a period of weeks","No exposure to antigen","Immunological memory develops","Immunity is achieved by injecting antigen"],a:2},
  {id:296,s:3,t:"Coagulation",q:"The first step in hemostasis is:",o:["Vascular spasm","Conversion of fibrinogen to fibrin","Activation of the intrinsic pathway","Activation of the common pathway","Platelet activation"],a:0},
  {id:297,s:3,t:"Coagulation",q:"Prothrombin is converted to thrombin during the:",o:["Intrinsic pathway","Extrinsic pathway","Common pathway","Formation of the platelet plug","None of the above"],a:2},
  {id:298,s:3,t:"Coagulation",q:"Haemophilia is characterized by:",o:["Inadequate production of heparin","Inadequate production of clotting factors","Excessive production of fibrinogen","Excessive production of platelets","Is the process by which clot is broken down"],a:1},
  {id:299,s:3,t:"Platelets",q:"Platelets are:",o:["Produced in the spleen","Made up of cytoplasm and microtubule only","80% of red blood cells","The smallest of blood cells","True cells"],a:3},
  {id:300,s:3,t:"Coagulation",q:"Vitamin K dependent clotting factors include:",o:["2,6,8,9","2,7,9,10","1,5,9,10","2,7,9,11","3,4,9,10"],a:1},
  // ── PDF 2: EXCITABLES MCQs — 30 QUESTIONS (with official answer key) ──────
  {id:301,s:1,t:"Action Potential",q:"Concerning stimulus response characteristics, which is correct?",o:["Threshold allows an excitable cell to discriminate signals","Electrotonic potentials are propagated","Stimulus artifact is due to current leakage","Temporal summation is very common in peripheral nerves","Chronaxie cannot generate AP"],a:0},
  {id:302,s:1,t:"Neuromuscular Disease",q:"Concerning neuromuscular disorders, which is correct?",o:["Widening of synaptic cleft by 50% is the major cause of myasthenia gravis","Reduction in the number of ACh receptors may cause myasthenia gravis","In Lambert Eaton syndrome Na channels are destroyed","In myasthenia gravis EPP developed is above threshold","Myasthenia gravis is very common in adults"],a:1},
  {id:303,s:1,t:"Smooth Muscle",q:"In smooth muscle, which is correct?",o:["One nerve ending innervates a single nerve fibre","Muscle contractions are mainly controlled by external innervation","Multi-unit SM rarely exhibit spontaneous arrhythmias","Spike duration in single unit smooth muscle is about 5ms","Visceral SM have no true resting membrane potential"],a:4},
  {id:304,s:1,t:"Autonomic Nervous System",q:"Which is NOT true about the sympathetic system?",o:["Inhibit salivation","Constrict pupil","Inhibit stomach activity","Decrease mucosal secretions","Relax airway"],a:1},
  {id:305,s:1,t:"Neurotransmission",q:"Botulinum toxin:",o:["Prevents ACH release","Prevents ACH storage","Inhibits cholinesterase","Is a nicotinic receptor agonist","Is a nicotinic receptor antagonist"],a:0},
  {id:306,s:1,t:"Neuromuscular Disease",q:"Lambert Eaton syndrome is due to antibodies against:",o:["Ca2+ channels","Phosphate channels","Cl- channels","A and B","None of the above"],a:0},
  {id:307,s:1,t:"Muscle Proteins",q:"In skeletal muscles at rest, myosin cross bridges are prevented from binding actin by:",o:["Calmodulin","Troponin","Tropomyosin","Titin","Phospholamban"],a:2},
  {id:308,s:1,t:"Muscle Physiology",q:"In comparing contractile responses in smooth and skeletal muscles, which is MOST different?",o:["Source of activator calcium","Role of calcium in contraction","Mechanism of force generation","Source of energy for contraction","Nature of contractile proteins"],a:0},
  {id:309,s:1,t:"Muscle Physiology",q:"What is the most important event in relaxation of muscles?",o:["Depletion of available fuels","Nerve signal","Reduced intracellular calcium","Force that re-extends contracted muscle","None of the above"],a:2},
  {id:310,s:1,t:"Synaptic Physiology",q:"One way neurotransmitters act to inhibit post-synaptic cells is by:",o:["Increase in Na+ conductance","Decrease in K+ conductance","Decrease in Cl- conductance","Increase in K+ conductance","Increase in Mg2+ conductance"],a:3},
  {id:311,s:1,t:"Muscle Physiology",q:"In the sarcotubular system, which is correct?",o:["Sarcoplasmic reticulum stores Ca2+","Transverse tubule is an invagination of the muscle membrane","Terminal cistern contains ryanodine channels","Transverse tubule contains dihydropyridine channels","All of the above"],a:4},
  {id:312,s:1,t:"Muscle Physiology",q:"In muscle fatigue, which is correct?",o:["ATP concentration is low","Height of muscle contraction is reduced","Latent period is prolonged","Initial velocity of contraction is reduced","All of the above"],a:0},
  {id:313,s:1,t:"Muscle Physiology",q:"In contraction of skeletal muscles, which is correct?",o:["Width of A band is unchanged","Calcium ions and ATP are required","Actin slides on top of the cross bridges","The I band shortens","All of the above"],a:4},
  {id:314,s:1,t:"Action Potential",q:"Concerning propagation of action potentials, which is correct?",o:["Antidromic impulses are conducted through synapses","Axons can conduct impulses in both directions","In orthodromic conduction impulses move towards the cell body","Electrotonic conduction is seen in myelinated fibers","Saltatory conduction is slower than electrotonic conduction"],a:1},
  {id:315,s:1,t:"Smooth Muscle",q:"In smooth muscle contraction, which is correct?",o:["Ca2+ is derived solely from the sarcoplasmic reticulum","Myosin is phosphorylated","Phosphatase is required for muscle contraction","Calcium binds to troponin I","Myosin is not involved"],a:1},
  {id:316,s:1,t:"Action Potential",q:"In RMP, which is correct?",o:["Cell membrane is equally permeable to Na and Cl","Membrane potential is almost equal to ENa+","Active transport does not contribute to the process","There are more cations inside the cell","RMP is a prerequisite for all excitable cells"],a:4},
  {id:317,s:1,t:"Neuromuscular Transmission",q:"In NMJ, which is correct?",o:["Synaptic cleft is 30-50nm wide","EPP is always above threshold","Acetyl transferase breaks down ACH","mEPP is a multiple of EPP","Amplitude of EPP could be decreased by diisopropyl fluorophosphate"],a:1},
  {id:318,s:1,t:"Muscle Physiology",q:"Which is correct about muscle properties?",o:["Length of a muscle reduces when it does negative work","Slow muscles have short twitch duration","White muscles are for gross sustained movements","Velocity of contraction varies directly with the load","Staircase effect is due to increased Ca2+ availability for troponin C"],a:4},
  {id:319,s:1,t:"Neurotransmission",q:"ACH is released at which of the following EXCEPT:",o:["Sympathetic innervation of sweat glands","Neuromuscular junction","Autonomic ganglia","Postganglionic fibers of sympathetic system","Postganglionic nerves of parasympathetic system"],a:3},
  {id:320,s:1,t:"Autonomic Nervous System",q:"In ANS, which is correct?",o:["Preganglionic axons are slow conducting unmyelinated B fibres","Postganglionic nerves are unmyelinated C fibres","Postganglionic fibres to sweat glands release NA","Preganglionic fibres to adrenals synapse away from the gland","Cranial nerve IX gives 75% of all PNS innervation"],a:1},
  {id:321,s:1,t:"Neurotransmission",q:"Concerning neurotransmission, which is correct?",o:["All motor neurons always release ACH","Preganglionic fibres sometimes release NA","ANS regulates conscious actions","Cell bodies of ANS fibres are in anterior horn cells","Post ganglionic fibres of sympathetic NS release NA"],a:4},
  {id:322,s:1,t:"Neurotransmission",q:"Which is NOT correctly matched?",o:["Hemicholinium and blockage of choline intake","Vesamicol and blockage of ACH uptake","Botulinum and blockage of ACH release","Reserpine and blockage of NA storage","Guanethidine and blockage of NA release"],a:1},
  {id:323,s:1,t:"Autonomic Nervous System",q:"Which is incorrect about the parasympathetic system?",o:["Sacral PNS outflow is majorly S2, S3","Postganglionic fibres of PNS are shorter than SNS","PNS is characterised by lots of postganglionic branching","Nicotinic receptors are found at ganglia and NMJ","Ca2+ is required for release of neurotransmitters from vesicles"],a:2},
  {id:324,s:1,t:"Autonomic Nervous System",q:"Cranial parasympathetic to the GIT is from:",o:["CN 3","CN 5","CN 7","CN 9","CN 10"],a:4},
  {id:325,s:1,t:"Nerve Fibres",q:"Which of the following is incorrect about nerve fibres?",o:["Node of Ranvier is 1 micrometer wide","Myelin is secreted by oligodendrocytes in CNS","AP is generated in the initial segment of motor nerves","Nerves are functionally divided into 3 important zones","Dendrites serve integratory functions"],a:3},
  {id:326,s:1,t:"Nerve Fibres",q:"In classification of nerves, which is correct?",o:["A fibres are most responsive to pressure","C fibres are least susceptible to anaesthetic agents","C fibres have the shortest spike duration","C fibres have the fastest conduction velocity","Aδ fibres serve as motor to muscle spindle"],a:0},
  {id:327,s:1,t:"Autonomic Nervous System",q:"The sympathetic system — which is correct?",o:["Origin is T1–T12 and S2-S4","Preganglionic fibres are unmyelinated","Effectors are smooth muscles","All of the above","None of the above"],a:2},
  {id:328,s:1,t:"Muscle Physiology",q:"In skeletal muscles, which is correct?",o:["Troponin molecular weight is 43,000","I band is anisotropic to polarised light","The size of A band shortens on muscle contraction","I band contains both actin and myosin","Contracture is produced by continuous stimulation of the muscle"],a:4},
  {id:329,s:1,t:"Synaptic Physiology",q:"In inhibitory neuronal transmission, which is correct?",o:["Glycine increases K+ conductance","Temporal summation of IPSP produces AP","GABAB receptors mediate Cl- conductance","Baclofen is GABAB antagonist","Golgi bottle neurons in spinal cord are involved"],a:4},
  {id:330,s:1,t:"Smooth Muscle",q:"In smooth muscles, which is correct?",o:["Multiunit SM contract as a syncytium","Multiunit SM is functionally similar to skeletal muscle","Single unit SM have unstable membrane potential","Single unit SM depend on external innervation","AP in visceral SM has a plateau phase"],a:3},
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const pct = (c: number, t: number) => t === 0 ? 0 : Math.round(c / t * 100);

function downloadAllQuestions() {
  const secGroups: Record<number, typeof ALL_Q> = {1:[],2:[],3:[],4:[]};
  ALL_Q.forEach(q => secGroups[q.s].push(q));

  const qHTML = [1,2,3,4].map(s => {
    const qs = secGroups[s];
    if (!qs.length) return "";
    return `
      <div style="background:${SECS[s].col}18;border-left:4px solid ${SECS[s].col};padding:10px 16px;margin:28px 0 16px;border-radius:4px;">
        <strong style="color:${SECS[s].col};">${SECS[s].icon} Section ${s}: ${SECS[s].title}</strong>
      </div>
      ${qs.map((q, qi) => `
        <div style="margin-bottom:14px;padding:12px 14px;border:1px solid #e2e8f0;border-radius:8px;page-break-inside:avoid;">
          <p style="font-weight:600;margin:0 0 8px;font-size:0.95rem;">${qi+1}. ${q.q}</p>
          ${q.o.map((o, i) => `<div style="margin:3px 0 3px 12px;font-size:0.875rem;${i===q.a?'color:#16a34a;font-weight:700;':''}">${LABELS[i]}. ${o}${i===q.a?' ✓':''}</div>`).join("")}
          <div style="margin-top:6px;font-size:0.75rem;color:#94a3b8;">Topic: ${q.t}</div>
        </div>
      `).join("")}
    `;
  }).join("");

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
  <title>UNEC Physiology 1st Test — Question Bank | campusmarketapp.com</title>
  <style>body{font-family:Georgia,serif;max-width:820px;margin:0 auto;padding:28px 24px;font-size:14px;}@media print{body{padding:16px}@page{margin:1.2cm}}</style>
  </head><body>
  <div style="text-align:center;border-bottom:3px solid #38bdf8;padding-bottom:20px;margin-bottom:28px;">
    <div style="font-size:2.5rem;margin-bottom:6px;">🫀</div>
    <h1 style="font-size:1.6rem;margin:0 0 4px;">UNEC Physiology — First Test CBT</h1>
    <h2 style="font-size:1.1rem;font-weight:400;color:#475569;margin:0 0 10px;">Question Bank with Answers (${ALL_Q.length} Questions)</h2>
    <div style="background:linear-gradient(135deg,#064e3b,#0c2a1a);border:2px solid #10b981;border-radius:10px;padding:12px 20px;display:inline-block;margin-bottom:8px;">
      <div style="color:#10b981;font-weight:700;font-size:1rem;">🛍️ Powered by Campus Market App</div>
      <div style="color:#6ee7b7;font-size:0.85rem;margin-top:2px;">campusmarketapp.com · Insure Your Business · Nigeria's #1 Student Marketplace</div>
    </div>
  </div>
  ${qHTML}
  <div style="text-align:center;margin-top:40px;border-top:2px solid #e2e8f0;padding-top:20px;">
    <div style="background:linear-gradient(135deg,#064e3b,#0c2a1a);border:1px solid #10b981;border-radius:10px;padding:16px 24px;display:inline-block;">
      <div style="color:#10b981;font-weight:700;font-size:1.1rem;">🛍️ Campus Market App · campusmarketapp.com</div>
      <div style="color:#a7f3d0;font-size:0.8rem;margin-top:4px;">Insure Your Business · Build Your Future · Conquer Every Exam</div>
    </div>
  </div>
  </body></html>`;

  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 600); }
}

const renderMd = (text: string) => text.split("\n").map((line, i) => {
  if (line.startsWith("## ")) return <h3 key={i} style={{color:"#60a5fa",fontFamily:"Georgia,serif",marginTop:"1.4rem",marginBottom:"0.4rem",borderBottom:"1px solid #1e3a5f",paddingBottom:"4px",fontSize:"1rem"}}>{line.slice(3)}</h3>;
  if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) return <li key={i} style={{marginLeft:"1.2rem",color:"#cbd5e1",lineHeight:"1.65",marginBottom:"3px",fontSize:"0.88rem"}}>{line.replace(/^[-*]\s/,"")}</li>;
  if (line.includes("Campus Market")) return <div key={i} style={{background:"linear-gradient(135deg,#0d2a1e,#0d1f38)",border:"1px solid #10b981",borderRadius:"12px",padding:"14px 18px",margin:"1rem 0",color:"#6ee7b7",fontWeight:"700",fontSize:"0.95rem",textAlign:"center",lineHeight:"1.7"}}>{line}</div>;
  if (line.trim() === "") return <br key={i}/>;
  return <p key={i} style={{color:"#cbd5e1",lineHeight:"1.65",marginBottom:"2px",fontSize:"0.88rem"}}>{line}</p>;
});

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box}.opt{transition:all .2s;cursor:pointer}.opt:hover{transform:translateX(3px)}
.pulse{animation:pulse 2s infinite}.fadeIn{animation:fadeIn .45s ease}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}@keyframes fadeIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:2px}`;

export default function PhysioCBT() {
  const { user } = useAuth();
  const [qs, setQs] = useState<typeof ALL_Q>([]);
  const [phase, setPhase] = useState<"intro"|"test"|"loading"|"results">("intro");
  const [idx, setIdx] = useState(0);
  const [ans, setAns] = useState<Record<number,number>>({});
  const [sel, setSel] = useState<number|null>(null);
  const [acked, setAcked] = useState(new Set<number>());
  const [analysis, setAnalysis] = useState<any>(null);
  const [sessionOpen, setSessionOpen] = useState<boolean|null>(null);
  const [lockedMessage, setLockedMessage] = useState("This session is currently locked by the admin.");
  const visitorLogId = useRef<string|null>(null);

  useEffect(() => {
    const checkAndLog = async () => {
      try {
        const { data: session } = await (supabase as any).from("academic_sessions").select("is_open, locked_message").eq("course_id","physio").maybeSingle();
        const open = session ? session.is_open : true;
        setSessionOpen(open);
        if (session?.locked_message) setLockedMessage(session.locked_message);
        if (open) {
          const { data: logEntry } = await (supabase as any).from("academic_visitors").insert({course_id:"physio",user_id:user?.id||null,user_email:user?.email||null,user_name:user?.user_metadata?.full_name||user?.email?.split("@")[0]||null,completed_test:false}).select("id").single();
          if (logEntry?.id) visitorLogId.current = logEntry.id;
        }
      } catch { setSessionOpen(true); }
    };
    checkAndLog();
  }, [user]);

  const logCompletion = async (score: number, total: number) => {
    if (!visitorLogId.current) return;
    await (supabase as any).from("academic_visitors").update({completed_test:true,score,total_questions:total,percentage:Math.round(score/total*100)}).eq("id",visitorLogId.current);
  };

  const q = qs[idx];
  const si = q ? SECS[q.s] : null;
  const showSecIntro = phase === "test" && q && !acked.has(q.s);

  const startExam = () => {
    const picked = shuffle(ALL_Q).slice(0,100).sort((a,b) => a.s - b.s);
    setQs(picked); setAns({}); setSel(null); setAcked(new Set()); setAnalysis(null); setIdx(0); setPhase("test");
  };

  const selOpt = (i: number) => { if (sel !== null) return; setSel(i); setAns(p => ({...p,[idx]:i})); };
  const goNext = () => {
    if (sel === null) return;
    if (idx < qs.length - 1) { const ni = idx+1; setIdx(ni); setSel(ans[ni]!==undefined?ans[ni]:null); }
    else submitTest();
  };
  const goBack = () => { if (idx <= 0) return; const pi = idx-1; setIdx(pi); setSel(ans[pi]!==undefined?ans[pi]:null); };

  const submitTest = async () => {
    setPhase("loading");
    const score = qs.reduce((acc,q,i) => acc+(ans[i]===q.a?1:0), 0);
    await logCompletion(score, qs.length);
    const ss: Record<number,number>={1:0,2:0,3:0,4:0}, sn: Record<number,number>={1:0,2:0,3:0,4:0};
    const topics: Record<string,{c:number;n:number}> = {};
    qs.forEach((q,i) => {
      sn[q.s]++; if(ans[i]===q.a) ss[q.s]++;
      if(!topics[q.t]) topics[q.t]={c:0,n:0}; topics[q.t].n++; if(ans[i]===q.a) topics[q.t].c++;
    });
    const tStr = Object.entries(topics).map(([k,v]) => `${k}: ${v.c}/${v.n} (${pct(v.c,v.n)}%)`).join("\n");
    const sStr = [1,2,3,4].filter(s=>sn[s]>0).map(s => `${SECS[s].title}: ${ss[s]}/${sn[s]} (${pct(ss[s],sn[s])}%)`).join(" | ");
    const prompt = `A 2nd Year MBBS/BDS/PHT student at UNEC completed a Physiology 1st Test CBT (100 randomly selected questions from ${ALL_Q.length}-question bank, 4 sections).

Score: ${score}/100 (${pct(score,100)}%)
${sStr}

Topic Performance:
${tStr}

Provide a detailed medical physiology educator analysis:

## 📊 Performance Summary
(Warm 2-3 sentences. MBBS pass is typically 50%)

## 💪 Strengths
(Sections/topics ≥ 70% — specific physiological praise with clinical significance)

## 📚 Areas to Strengthen
(Sections/topics < 60% — kind but direct feedback with specific concepts to revisit)

## 🎯 Study Recommendations
(4-5 targeted study strategies for weakest topics — include clinical correlations and mnemonics)

## 🧪 Practice Questions
(4 new MCQs with 5 options each targeting the 2 weakest topics. Mark ✅ correct answer)

## 🏆 Final Word
End ONLY with: "🏆 Campus Market app is all about success — insure your business, build your future, and conquer every exam!"`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:prompt}]})});
      const data = await res.json();
      const text = data.content?.map((c:any) => c.text||"").join("\n")||"Analysis unavailable.";
      setAnalysis({score,ss,sn,topics,text});
    } catch {
      setAnalysis({score,ss,sn,topics,text:`## 📊 Performance Summary\nYou completed the Physiology 1st Test CBT!\n\n## 🏆 Final Word\n🏆 Campus Market app is all about success — insure your business, build your future, and conquer every exam!`});
    }
    setPhase("results");
  };

  if (sessionOpen === null) return (
    <div style={{minHeight:"100vh",background:"#060b14",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",flexDirection:"column",gap:"12px"}}>
      <style>{CSS}</style>
      <div className="pulse" style={{fontSize:"2.5rem"}}>🫀</div>
      <p style={{color:"#475569",fontSize:"0.88rem"}}>Checking session status...</p>
    </div>
  );

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
        </div>
        <button onClick={() => window.history.back()} style={{background:"#0c1420",border:"1px solid #1e3a5f",borderRadius:"10px",padding:"11px 28px",color:"#475569",fontSize:"0.88rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>← Go Back</button>
      </div>
    </div>
  );

  if (phase === "intro") return (
    <div style={{minHeight:"100vh",background:"#060b14",display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",fontFamily:"'DM Sans',sans-serif"}}>
      <style>{CSS}</style>
      <div className="fadeIn" style={{maxWidth:"580px",width:"100%"}}>
        <div style={{background:"linear-gradient(135deg,#064e3b,#0c1a0c)",border:"1px solid #10b981",borderRadius:"14px",padding:"13px 18px",marginBottom:"18px",display:"flex",alignItems:"center",gap:"12px"}}>
          <span style={{fontSize:"1.5rem"}}>🛍️</span>
          <div>
            <div style={{color:"#10b981",fontWeight:"700",fontSize:"0.85rem"}}>Campus Market App · campusmarketapp.com</div>
            <div style={{color:"#6ee7b7",fontSize:"0.75rem"}}>Insure your business success · Nigeria's #1 Student Marketplace</div>
          </div>
          <div style={{marginLeft:"auto",background:"#10b98122",border:"1px solid #10b981",borderRadius:"7px",padding:"3px 10px",color:"#10b981",fontSize:"0.7rem",fontWeight:"700"}}>POWERED BY</div>
        </div>
        <div style={{textAlign:"center",marginBottom:"18px"}}>
          <div style={{fontSize:"3rem",marginBottom:"8px"}}>🫀</div>
          <h1 style={{fontFamily:"'Crimson Pro',serif",fontSize:"2rem",fontWeight:"700",color:"#e2e8f0",margin:"0 0 4px"}}>Physiology — 1st Test CBT</h1>
          <p style={{color:"#334155",fontSize:"0.78rem",marginBottom:"4px"}}>MBBS/BDS/PHT 2024/2025 · UNEC · Department of Physiology</p>
          <p style={{color:"#475569",fontSize:"0.78rem",margin:0}}>{ALL_Q.length}-Question Bank · 100 Random Questions Per Session · 4 Sections · AI Analysis</p>
        </div>
        <div style={{background:"#0c1420",border:"1px solid #1e3a5f",borderRadius:"16px",padding:"16px 22px",marginBottom:"14px"}}>
          {[1,2,3,4].map(s => (
            <div key={s} style={{display:"flex",gap:"10px",alignItems:"center",marginBottom:s<4?"10px":0}}>
              <span style={{fontSize:"1.05rem"}}>{SECS[s].icon}</span>
              <span style={{color:SECS[s].col,fontWeight:"600",fontSize:"0.82rem"}}>{SECS[s].title}</span>
            </div>
          ))}
        </div>
        <div style={{background:"#0c1420",border:"1px solid #7c3aed33",borderRadius:"10px",padding:"10px 16px",marginBottom:"18px",fontSize:"0.76rem",color:"#a78bfa",textAlign:"center"}}>
          🔀 100 questions randomly drawn from {ALL_Q.length}-question bank — every session is unique!
        </div>
        <button onClick={startExam} style={{width:"100%",background:"linear-gradient(135deg,#1d4ed8,#2563eb)",border:"none",borderRadius:"12px",padding:"14px",color:"white",fontSize:"0.98rem",fontWeight:"600",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",boxShadow:"0 0 28px #1d4ed844",transition:"all .2s"}}
          onMouseOver={e=>{(e.currentTarget as HTMLButtonElement).style.transform="scale(1.02)"}}
          onMouseOut={e=>{(e.currentTarget as HTMLButtonElement).style.transform="scale(1)"}}
        >Begin Examination →</button>
      </div>
    </div>
  );

  if (showSecIntro && si) return (
    <div style={{minHeight:"100vh",background:"#060b14",display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",fontFamily:"'DM Sans',sans-serif"}}>
      <style>{CSS}</style>
      <div className="fadeIn" style={{maxWidth:"460px",width:"100%",textAlign:"center"}}>
        <div style={{fontSize:"3rem",marginBottom:"12px"}}>{si.icon}</div>
        <h2 style={{fontFamily:"'Crimson Pro',serif",color:"#e2e8f0",fontSize:"1.7rem",margin:"0 0 16px"}}>{si.title}</h2>
        <div style={{background:"#0c1420",border:`1px solid ${si.col}44`,borderRadius:"14px",padding:"16px",marginBottom:"12px"}}>
          <p style={{color:"#94a3b8",lineHeight:"1.7",margin:0,fontSize:"0.88rem"}}>{si.rule}</p>
        </div>
        <div style={{background:"#064e3b22",border:"1px solid #10b98144",borderRadius:"9px",padding:"7px 14px",marginBottom:"18px",fontSize:"0.73rem",color:"#6ee7b7"}}>
          🛍️ Powered by Campus Market App · campusmarketapp.com
        </div>
        <button onClick={() => setAcked(p => new Set([...p, q.s]))} style={{background:`linear-gradient(135deg,${si.col}cc,${si.col})`,border:"none",borderRadius:"12px",padding:"13px 36px",color:"#060b14",fontSize:"0.95rem",fontWeight:"700",cursor:"pointer",transition:"all .2s"}}>
          Start Section →
        </button>
      </div>
    </div>
  );

  if (phase === "loading") return (
    <div style={{minHeight:"100vh",background:"#060b14",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",textAlign:"center",color:"#94a3b8"}}>
      <style>{CSS}</style>
      <div>
        <div className="pulse" style={{fontSize:"3.5rem",marginBottom:"16px"}}>🫀</div>
        <h2 style={{fontFamily:"'Crimson Pro',serif",color:"#e2e8f0",marginBottom:"8px"}}>Marking Your Paper...</h2>
        <p style={{fontSize:"0.9rem"}}>AI is analysing your physiology answers</p>
        <div style={{marginTop:"18px",display:"flex",gap:"8px",justifyContent:"center"}}>
          {[0,1,2,3].map(i => <div key={i} style={{width:"8px",height:"8px",borderRadius:"50%",background:"#3b82f6",animation:`pulse ${0.6+i*0.15}s ${i*0.15}s infinite`}}/>)}
        </div>
        <div style={{marginTop:"20px",background:"#064e3b22",border:"1px solid #10b98144",borderRadius:"9px",padding:"7px 18px",fontSize:"0.72rem",color:"#6ee7b7"}}>
          🛍️ Campus Market · campusmarketapp.com
        </div>
      </div>
    </div>
  );

  if (phase === "results" && analysis) {
    const {score,ss,sn,topics,text} = analysis;
    const grd = score>=80?"A+":score>=70?"A":score>=60?"B":score>=50?"C":score>=40?"D":"F";
    const gCol = score>=60?"#34d399":score>=50?"#fbbf24":"#ef4444";
    return (
      <div style={{minHeight:"100vh",background:"#060b14",fontFamily:"'DM Sans',sans-serif",padding:"16px 16px 36px"}}>
        <style>{CSS}</style>
        <div style={{maxWidth:"680px",margin:"0 auto"}}>
          <div style={{textAlign:"center",padding:"16px 0 14px"}}>
            <div style={{fontFamily:"'Crimson Pro',serif",fontSize:"3.8rem",fontWeight:"700",color:gCol,lineHeight:1}}>{score}<span style={{fontSize:"1.8rem",color:"#475569"}}>/100</span></div>
            <div style={{fontSize:"1.1rem",fontWeight:"700",color:gCol,marginBottom:"4px"}}>Grade {grd} · {pct(score,100)}%</div>
            <p style={{color:"#475569",fontSize:"0.78rem",margin:0}}>Physiology 1st Test · UNEC</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"9px",marginBottom:"12px"}}>
            {[1,2,3,4].map(s => {
              if (!sn[s]) return null;
              const c = SECS[s].col, p = pct(ss[s],sn[s]);
              return (<div key={s} style={{background:"#0c1420",border:`1px solid ${c}33`,borderRadius:"11px",padding:"12px"}}>
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
          <div style={{background:"#0c1420",border:"1px solid #1e3a5f",borderRadius:"13px",padding:"15px",marginBottom:"12px"}}>
            <h3 style={{color:"#93c5fd",fontFamily:"'Crimson Pro',serif",margin:"0 0 10px",fontSize:"0.92rem"}}>📊 Topic Breakdown</h3>
            <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
              {Object.entries(topics).map(([t,v]:any) => {
                const p=pct(v.c,v.n),col=p>=70?"#34d399":p>=50?"#fbbf24":"#ef4444";
                return (<div key={t} style={{background:"#111827",border:`1px solid ${col}44`,borderRadius:"7px",padding:"5px 10px"}}>
                  <div style={{color:"#e2e8f0",fontSize:"0.72rem",fontWeight:"600"}}>{t}</div>
                  <div style={{color:col,fontSize:"0.69rem"}}>{v.c}/{v.n} · {p}%</div>
                </div>);
              })}
            </div>
          </div>
          <button onClick={downloadAllQuestions} style={{width:"100%",background:"linear-gradient(135deg,#1e3a5f,#1d4ed8)",border:"1px solid #3b82f6",borderRadius:"12px",padding:"13px",color:"#93c5fd",fontSize:"0.9rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:"600",transition:"all .2s",marginBottom:"10px",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}>
            📥 Download All {ALL_Q.length} Questions + Answers (Print/PDF)
          </button>
          <div style={{background:"linear-gradient(135deg,#064e3b,#0c2a1a)",border:"1px solid #10b981",borderRadius:"13px",padding:"16px 18px",marginBottom:"12px"}}>
            <div style={{display:"flex",gap:"12px",alignItems:"flex-start"}}>
              <span style={{fontSize:"1.8rem"}}>🛍️</span>
              <div>
                <div style={{color:"#10b981",fontWeight:"700",fontSize:"0.92rem",marginBottom:"3px"}}>Insure Your Business with Campus Market App</div>
                <p style={{color:"#6ee7b7",fontSize:"0.8rem",lineHeight:"1.6",margin:0}}>List products, reach campus buyers, grow with confidence. <strong>campusmarketapp.com</strong> — Nigeria's #1 student marketplace.</p>
              </div>
            </div>
          </div>
          <div style={{background:"#0c1420",border:"1px solid #1e3a5f",borderRadius:"13px",padding:"18px",marginBottom:"12px"}}>
            <h3 style={{color:"#93c5fd",fontFamily:"'Crimson Pro',serif",margin:"0 0 10px",fontSize:"0.92rem"}}>🤖 AI Analysis & Recommendations</h3>
            <div style={{maxHeight:"52vh",overflowY:"auto",paddingRight:"4px"}}>{renderMd(text)}</div>
          </div>
          <button onClick={startExam} style={{width:"100%",background:"linear-gradient(135deg,#064e3b,#065f46)",border:"1px solid #10b981",borderRadius:"12px",padding:"12px",color:"#10b981",fontSize:"0.88rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:"600",marginBottom:"8px"}}>
            🔀 New Shuffle — Retake with Different 100 Questions
          </button>
          <button onClick={() => {setPhase("intro");setQs([]);}} style={{width:"100%",background:"#0c1420",border:"1px solid #1e3a5f",borderRadius:"12px",padding:"12px",color:"#475569",fontSize:"0.86rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
            ← Back to Intro
          </button>
        </div>
      </div>
    );
  }

  if (phase !== "test" || !q || !si) return null;
  const progP = pct(idx+1, qs.length);

  return (
    <div style={{minHeight:"100vh",background:"#060b14",fontFamily:"'DM Sans',sans-serif",padding:"14px",display:"flex",flexDirection:"column",alignItems:"center"}}>
      <style>{CSS}</style>
      <div style={{maxWidth:"620px",width:"100%"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
          <div style={{display:"flex",gap:"3px"}}>
            {[1,2,3,4].map(s => <div key={s} style={{height:"3px",width:"32px",borderRadius:"2px",background:q.s>s?"#1e3a5f":q.s===s?SECS[s].col:"#0f172a"}}/>)}
          </div>
          <div style={{background:"#064e3b22",border:"1px solid #10b98144",borderRadius:"6px",padding:"2px 8px",fontSize:"0.63rem",color:"#10b981",fontWeight:"600"}}>🛍️ Campus Market</div>
        </div>
        <div style={{marginBottom:"12px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
            <span style={{color:si.col,fontSize:"0.74rem",fontWeight:"600"}}>{si.icon} {si.title}</span>
            <span style={{color:"#334155",fontSize:"0.74rem"}}>{idx+1} / {qs.length}</span>
          </div>
          <div style={{height:"3px",background:"#0c1420",borderRadius:"2px",overflow:"hidden"}}>
            <div style={{height:"100%",width:`${progP}%`,background:`linear-gradient(90deg,${si.col}77,${si.col})`,transition:"width .4s ease"}}/>
          </div>
        </div>
        <div style={{background:"#0c1420",border:`1px solid ${si.col}33`,borderRadius:"17px",padding:"18px",marginBottom:"10px"}}>
          <div style={{marginBottom:"10px"}}>
            <span style={{background:`${si.col}15`,color:si.col,padding:"2px 9px",borderRadius:"5px",fontSize:"0.68rem",fontWeight:"600"}}>{q.t}</span>
          </div>
          <p style={{color:"#e2e8f0",fontSize:"0.97rem",fontWeight:"600",lineHeight:"1.65",margin:"0 0 14px",fontFamily:"'Crimson Pro',serif"}}>{q.q}</p>
          <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
            {q.o.map((opt, i) => {
              let bg="#111827", border="#1e293b", col="#94a3b8";
              if (sel !== null) { if(i===q.a){bg="#0a2a1a";border="#22c55e";col="#86efac";}else if(i===sel&&sel!==q.a){bg="#2a0a0a";border="#ef4444";col="#fca5a5";} }
              return (<button key={i} className="opt" onClick={() => selOpt(i)} style={{background:bg,border:`1px solid ${border}`,borderRadius:"9px",padding:"9px 12px",textAlign:"left",display:"flex",gap:"8px",alignItems:"flex-start",color:col,opacity:sel!==null&&i!==q.a&&i!==sel?0.35:1,fontSize:"0.86rem",lineHeight:"1.5",cursor:"pointer"}}>
                <span style={{minWidth:"21px",height:"21px",borderRadius:"5px",background:`${border}33`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"700",fontSize:"0.73rem",color:border,flexShrink:0,marginTop:"1px"}}>{LABELS[i]}</span>
                <span style={{flex:1}}>{opt}</span>
                {sel !== null && i===q.a && <span style={{color:"#22c55e",flexShrink:0}}>✓</span>}
                {sel !== null && i===sel && sel!==q.a && <span style={{color:"#ef4444",flexShrink:0}}>✗</span>}
              </button>);
            })}
          </div>
        </div>
        <div style={{display:"flex",gap:"8px",marginBottom:"10px"}}>
          <button onClick={goBack} disabled={idx===0} style={{flex:1,background:"#0c1420",border:"1px solid #1e3a5f",borderRadius:"9px",padding:"11px",color:idx===0?"#1e293b":"#475569",cursor:idx===0?"not-allowed":"pointer",fontSize:"0.84rem"}}>← Back</button>
          <button onClick={goNext} disabled={sel===null} style={{flex:2.5,background:sel===null?"#0c1420":`linear-gradient(135deg,${si.col}cc,${si.col})`,border:sel===null?"1px solid #1e3a5f":"none",borderRadius:"9px",padding:"11px",color:sel===null?"#1e293b":"#060b14",cursor:sel===null?"not-allowed":"pointer",fontWeight:"600",fontSize:"0.88rem",transition:"all .2s"}}>
            {idx===qs.length-1?"Submit Examination 🎯":"Next →"}
          </button>
        </div>
        <div style={{display:"flex",justifyContent:"center",gap:"4px",flexWrap:"wrap"}}>
          {qs.filter(qq => qq.s===q.s).map((qq,i) => {
            const qi = qs.indexOf(qq), a = ans[qi];
            return (<div key={i} onClick={() => {setIdx(qi);setSel(ans[qi]!==undefined?ans[qi]:null);}} style={{width:"7px",height:"7px",borderRadius:"50%",cursor:"pointer",background:a===undefined?"#1e293b":a===qq.a?"#22c55e":"#ef4444",opacity:qi===idx?1:0.55,border:qi===idx?`1px solid ${si.col}`:"none",transition:"all .2s"}}/>);
          })}
        </div>
      </div>
    </div>
  );
}
