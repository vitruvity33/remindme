"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Mic, Type, Image as ImageIcon, Users, Calendar, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AuthButton } from "@/components/AuthButton";
import { PersonInfoCard } from "@/components/capture/PersonInfoCard";
import { RelationshipCircleSelector } from "@/components/capture/RelationshipCircleSelector";
import { InteractionDetailsLog } from "@/components/capture/InteractionDetailsLog";
import { GlobalModeHeader } from "@/components/layout/GlobalModeHeader";
import { DirectSaveButton } from "@/components/capture/DirectSaveButton";
import { SectionManager, SectionConfig } from "@/components/capture/SectionManager";
import { supabase } from "@/lib/supabase";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { InteractionDetail } from "@/lib/types";

type Section = "all" | "personal" | "business" | "projects" | "relationships" | "todos" | "events" | "trips";

// Sortable Event Card Component
function SortableEventCard({ event }: { event: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: event.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="bg-white border-gray-200 p-4 hover:bg-gray-50 transition-all cursor-move">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-semibold text-gray-800">{event.name}</h3>
            <p className="text-sm text-gray-600">{event.date ? new Date(event.date).toLocaleDateString() : 'No date'}</p>
          </div>
        </div>
        {event.location && (
          <p className="text-xs text-gray-500">📍 {event.location}</p>
        )}
      </Card>
    </div>
  );
}

// Sortable Follow-up Card Component
function SortableFollowUpCard({ followUp }: { followUp: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: followUp.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="bg-white border-gray-200 p-4 hover:bg-gray-50 transition-all cursor-move">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <p className="text-sm text-gray-800">{followUp.description}</p>
          </div>
          <Badge
            className={
              followUp.priority === "high"
                ? "bg-red-100 text-red-700 border-red-200"
                : followUp.priority === "medium"
                ? "bg-amber-100 text-amber-700 border-amber-200"
                : "bg-gray-100 text-gray-700 border-gray-200"
            }
          >
            {followUp.priority || 'medium'}
          </Badge>
        </div>
        <p className="text-xs text-gray-500">
          Status: {followUp.status || 'pending'}
        </p>
      </Card>
    </div>
  );
}

// Sortable Person Card Component
function SortablePersonCard({ person, onLoad, onDelete }: { person: any; onLoad: (id: string) => void; onDelete: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: person.id });

  const [showMenu, setShowMenu] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowMenu(false);
    if (showMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMenu]);

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="relative">
      <Card 
        className="bg-white border-gray-200 p-4 hover:bg-gray-50 transition-all cursor-move"
        onClick={(e) => {
          if (!isDragging) {
            onLoad(person.id);
          }
        }}
      >
        {/* Three-dot menu */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-1"
        >
          ⋮
        </button>

        {/* Dropdown menu */}
        {showMenu && (
          <div className="absolute top-8 right-2 bg-white border border-gray-200 rounded shadow-lg z-10 min-w-[120px]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                if (confirm(`Delete ${person.name}?`)) {
                  onDelete(person.id);
                }
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
            >
              Delete
            </button>
          </div>
        )}

        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-semibold text-gray-800">{person.name}</h3>
            <p className="text-sm text-gray-600">
              {person.role && person.company ? `${person.role} at ${person.company}` : person.role || person.company || 'No details'}
            </p>
          </div>
          {person.inspiration_level && (
            <Badge
              className={
                person.inspiration_level === "high"
                  ? "bg-green-100 text-green-700 border-green-200"
                  : person.inspiration_level === "medium"
                  ? "bg-amber-100 text-amber-700 border-amber-200"
                  : "bg-gray-100 text-gray-700 border-gray-200"
              }
            >
              {person.inspiration_level === "high" ? "⭐ Inspiring" : "Worth nurturing"}
            </Badge>
          )}
        </div>
        {person.interests && person.interests.length > 0 && (
          <div className="flex gap-2 mb-2">
            {person.interests.slice(0, 3).map((interest: string, idx: number) => (
              <Badge key={idx} variant="outline" className="text-xs border-gray-300 text-gray-600">
                {interest}
              </Badge>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-500">
          Added: {new Date(person.created_at).toLocaleDateString()}
        </p>
      </Card>
    </div>
  );
}

// Extend Window interface for browser speech recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function Home() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("all");
  const [captureText, setCaptureText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [noteCount, setNoteCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiPreview, setAiPreview] = useState<any>(null);
  const [showRawNotes, setShowRawNotes] = useState(true);
  const [contextType, setContextType] = useState<string>("event"); // event, personal, business, todo, project, trip
  const [persistentEvent, setPersistentEvent] = useState("");
  const [showEventInput, setShowEventInput] = useState(false);
  const [showSessionFields, setShowSessionFields] = useState(false);
  const [sectionName, setSectionName] = useState("");
  const [panelParticipants, setPanelParticipants] = useState("");
  const [linkedInUrls, setLinkedInUrls] = useState("");
  const [companyLinkedInUrls, setCompanyLinkedInUrls] = useState("");
  const [linkedInProfilePaste, setLinkedInProfilePaste] = useState("");
  const [parsedProfileData, setParsedProfileData] = useState<any>(null);
  const [parsedProfilesArray, setParsedProfilesArray] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isParsingUrls, setIsParsingUrls] = useState(false);
  const [isContextExpanded, setIsContextExpanded] = useState(false);
  const [isEditingPreview, setIsEditingPreview] = useState(false);
  const [editedPreview, setEditedPreview] = useState<any>(null);
  const [showAboutMe, setShowAboutMe] = useState(false);
  const [editedMainNotes, setEditedMainNotes] = useState("");
  const [personName, setPersonName] = useState("");
  const [personCompany, setPersonCompany] = useState("");
  const [authUser, setAuthUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [personRole, setPersonRole] = useState("");
  const [personLocation, setPersonLocation] = useState("");
  const [personInterests, setPersonInterests] = useState("");
  const [relationshipCircle, setRelationshipCircle] = useState<string | null>(null);
  const [interactionDetails, setInteractionDetails] = useState<InteractionDetail[]>([]);
  const [loadedPersonId, setLoadedPersonId] = useState<string | null>(null); // Track if editing existing person
  const [loadedMemoryIds, setLoadedMemoryIds] = useState<string[]>([]); // Track existing memory IDs to avoid re-saving
  const [additionalFields, setAdditionalFields] = useState<Array<{id: string, value: string}>>([]);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  
  // Section configuration - user can modify visibility and order
  const defaultSectionConfig: SectionConfig[] = [
    { id: 'relationship_circle', title: 'Relationship & Details', component: null as any, visible: true, order: 0 },
    { id: 'context', title: 'Context & Social Media', component: null as any, visible: true, order: 1 },
    { id: 'linkedin', title: 'LinkedIn Profile', component: null as any, visible: true, order: 2 },
    { id: 'conversations', title: 'Conversations', component: null as any, visible: true, order: 3 },
    { id: 'followups', title: 'Follow-ups', component: null as any, visible: true, order: 4 },
    { id: 'memories', title: 'Memories', component: null as any, visible: true, order: 5 },
    { id: 'research', title: 'Research', component: null as any, visible: true, order: 6 },
  ];
  
  const [sectionConfig, setSectionConfig] = useState<SectionConfig[]>(defaultSectionConfig);
  
  // Load from localStorage after mount (client-side only) to avoid hydration mismatch
  useEffect(() => {
    const saved = localStorage.getItem('sectionConfig');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSectionConfig(parsed);
      } catch (e) {
        console.error('Failed to parse saved section config:', e);
      }
    }
  }, []);
  
  // Track which sections are expanded
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    relationship_circle: false,
    context: false,
    linkedin: false,
    conversations: false,
    followups: false,
    memories: false,
    research: false,
  });
  
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };
  const [people, setPeople] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [relationshipFilter, setRelationshipFilter] = useState<string>('all');
  const [sortPeopleBy, setSortPeopleBy] = useState<'name' | 'date-added' | 'company'>('date-added');
  const recognitionRef = useRef<any>(null);
  const isProcessingRef = useRef(false);

  // Store the latest transcript
  const [latestTranscript, setLatestTranscript] = useState("");

  // Fetch people from database
  const fetchPeople = async () => {
    try {
      const { data, error } = await supabase
        .from('people')
        .select('*')
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      console.log("📚 Loaded people:", data?.length);
      setPeople(data || []);
    } catch (error) {
      console.error("Error fetching people:", error);
    }
  };

  // Fetch events from database
  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching events:", error);
        setEvents([]);
        return;
      }
      console.log("📅 Loaded events:", data?.length);
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      setEvents([]);
    }
  };

  // Fetch follow-ups from database
  const fetchFollowUps = async () => {
    try {
      const { data, error } = await supabase
        .from('follow_ups')
        .select('*')
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching follow-ups:", error);
        setFollowUps([]);
        return;
      }
      console.log("✅ Loaded follow-ups:", data?.length);
      setFollowUps(data || []);
    } catch (error) {
      console.error("Error fetching follow-ups:", error);
      setFollowUps([]);
    }
  };

  // Handle drag end for people
  const handlePeopleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = people.findIndex((p) => p.id === active.id);
      const newIndex = people.findIndex((p) => p.id === over.id);

      const newPeople = arrayMove(people, oldIndex, newIndex);
      setPeople(newPeople);

      // Update display_order in database
      try {
        const updates = newPeople.map((person, index) => ({
          id: person.id,
          display_order: index
        }));

        for (const update of updates) {
          await supabase
            .from('people')
            .update({ display_order: update.display_order })
            .eq('id', update.id);
        }
      } catch (error) {
        console.error("Error updating order:", error);
      }
    }
  };

  // Handle drag end for events
  const handleEventsDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = events.findIndex((e) => e.id === active.id);
      const newIndex = events.findIndex((e) => e.id === over.id);

      const newEvents = arrayMove(events, oldIndex, newIndex);
      setEvents(newEvents);

      try {
        const updates = newEvents.map((event, index) => ({
          id: event.id,
          display_order: index
        }));

        for (const update of updates) {
          await supabase
            .from('events')
            .update({ display_order: update.display_order })
            .eq('id', update.id);
        }
      } catch (error) {
        console.error("Error updating order:", error);
      }
    }
  };

  // Handle drag end for follow-ups
  const handleFollowUpsDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = followUps.findIndex((f) => f.id === active.id);
      const newIndex = followUps.findIndex((f) => f.id === over.id);

      const newFollowUps = arrayMove(followUps, oldIndex, newIndex);
      setFollowUps(newFollowUps);

      try {
        const updates = newFollowUps.map((followUp, index) => ({
          id: followUp.id,
          display_order: index
        }));

        for (const update of updates) {
          await supabase
            .from('follow_ups')
            .update({ display_order: update.display_order })
            .eq('id', update.id);
        }
      } catch (error) {
        console.error("Error updating order:", error);
      }
    }
  };

  // Load person data into form
  const loadPersonIntoForm = async (personId: string) => {
    try {
      // Fetch person with their memories and follow-ups
      const { data: person, error: personError } = await supabase
        .from('people')
        .select('*')
        .eq('id', personId)
        .single();

      if (personError) throw personError;

      // Fetch conversations for this person (from conversations table)
      const { data: conversations, error: conversationsError } = await supabase
        .from('conversations')
        .select('*')
        .eq('person_id', personId)
        .order('date', { ascending: false });

      // Fetch memories linked to this person (from memories table)
      const { data: memoryLinks, error: memoriesError } = await supabase
        .from('memory_people')
        .select('memory_id, memories(*)')
        .eq('person_id', personId);

      // Fetch follow-ups for this person
      const { data: followUps, error: followUpsError } = await supabase
        .from('follow_ups')
        .select('*')
        .eq('person_id', personId);

      // Populate form fields
      setPersonName(person.name || '');
      setPersonCompany(person.company || '');
      setPersonRole(person.role || '');
      setPersonLocation(person.location || '');
      setPersonInterests(person.interests ? person.interests.join(', ') : '');
      setRelationshipCircle(person.relationship_circle || null);
      setInteractionDetails(person.interaction_details || []);
      setLinkedInUrls(person.linkedin_url || '');
      setCompanyLinkedInUrls(person.company_linkedin_url || '');

      // Format conversations
      const formattedConversations = (conversations || []).map((conv: any) => ({
        id: conv.id,
        text: conv.text,
        date: conv.date ? new Date(conv.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }) : '',
        isExisting: true
      }));

      // Format memories
      const experientialMemories: any[] = [];
      const existingMemoryIds: string[] = [];
      
      memoryLinks?.forEach((m: any) => {
        const memory = m.memories;
        if (!memory || !memory.text || !memory.text.trim()) return; // Skip empty memories
        
        existingMemoryIds.push(memory.id); // Track existing memory IDs
        
        experientialMemories.push({
          id: memory.id,
          text: memory.text.trim(),
          date: memory.date ? new Date(memory.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }) : '',
          isExisting: true
        });
      });
      
      // Store the existing memory IDs
      setLoadedMemoryIds(existingMemoryIds);

      // Fetch person background data (LinkedIn/career info)
      const { data: background } = await supabase
        .from('people_background')
        .select('*')
        .eq('person_id', personId)
        .single();
      
      // Aggregate keywords, entities, industries from conversations and memories
      const allKeywords = new Set<string>();
      const allEntities = new Set<string>();
      const allIndustries = new Set<string>();
      
      conversations?.forEach((conv: any) => {
        conv.keywords?.forEach((k: string) => allKeywords.add(k));
        conv.entities?.forEach((e: string) => allEntities.add(e));
        conv.industries?.forEach((i: string) => allIndustries.add(i));
      });
      
      memoryLinks?.forEach((m: any) => {
        const memory = m.memories;
        memory?.keywords?.forEach((k: string) => allKeywords.add(k));
        memory?.entities?.forEach((e: string) => allEntities.add(e));
        memory?.industries?.forEach((i: string) => allIndustries.add(i));
      });

      // Create preview with person data and background
      const previewData = {
        people: [{
          ...person,
          skills: background?.skills || [],
          technologies: background?.technologies || [],
          interests: background?.interests || [],
          about: background?.about || null,
          experience: background?.experience || null,
          education: background?.education || null,
        }],
        keywords: Array.from(allKeywords),
        entities: Array.from(allEntities), // Companies and people mentioned
        industries: Array.from(allIndustries),
        additional_notes: formattedConversations, // Conversations from conversations table
        memories: experientialMemories, // Memories from memories table
        follow_ups: followUps?.map((f: any) => ({
          id: f.id,
          description: f.description || '',
          priority: f.priority || 'medium',
          urgency: f.urgency || 'not-urgent-not-important',
          status: f.status === 'pending' ? 'not-started' : (f.status || 'not-started'),
          date: f.date ? new Date(f.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }) : '',
          due_date: f.due_date || '',
          isExisting: true
        })).filter((fu: any) => fu.description) || [],
      };

      setAiPreview(previewData);
      setEditedPreview(JSON.parse(JSON.stringify(previewData)));
      setIsEditingPreview(true);
      setShowRawNotes(false);
      
      // Keep all sections collapsed - let user choose what to open
      setExpandedSections({
        context: false,
        linkedin: false,
        conversations: false,
        followups: false,
        memories: false,
        research: false,
      });

      // Store the person ID so we know to UPDATE instead of INSERT
      setLoadedPersonId(personId);
    } catch (error) {
      console.error('Error loading person:', error);
      alert('Failed to load person data');
    }
  };

  // Setup sensors for drag (requires long press on touch devices)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  // Check auth status on mount and load people
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log("🔐 Auth Check:", {
        hasSession: !!session,
        user: session?.user?.email,
        error: error?.message
      });
      setAuthUser(session?.user || null);
      setAuthChecked(true);
      
      // Load data if authenticated
      if (session) {
        fetchPeople();
        fetchEvents();
        fetchFollowUps();
      }
    };
    checkAuth();
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined" && !recognitionRef.current) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true; // Keep listening
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          const transcript = event.results[event.results.length - 1][0].transcript;
          if (transcript.trim()) {
            setLatestTranscript(transcript);
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          if (event.error !== 'aborted' && event.error !== 'no-speech') {
            alert(`Speech recognition error: ${event.error}`);
          }
          setIsListening(false);
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsListening(false);
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
    };
  }, []);

  // Handle transcript when it changes
  useEffect(() => {
    if (latestTranscript) {
      // If in preview mode (aiPreview exists), add to My Notes
      if (aiPreview && editedPreview) {
        const notes = editedPreview.additional_notes || [];
        const today = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
        const newNote = {
          date: today,
          text: latestTranscript.trim()
        };
        const newNotes = [newNote, ...notes];
        setEditedPreview({...editedPreview, additional_notes: newNotes});
      } else {
        // Otherwise, add to capture text with date
        const today = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
        const newText = `${today} - ${latestTranscript.trim()}`;
        setCaptureText((prev) => prev ? `${newText}\n${prev}` : newText);
      }
      setLatestTranscript(""); // Clear after processing
    }
  }, [latestTranscript, aiPreview, editedPreview]);

  const handleMicClick = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Safari, or Edge.");
      return;
    }

    if (isListening) {
      // Stop recording
      recognitionRef.current.stop();
      setIsListening(false);
      setIsRecording(false);
    } else {
      // Start recording
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setIsRecording(true);
      } catch (error) {
        console.error("Error starting speech recognition:", error);
      }
    }
  };

  const handleOrganizeWithAI = async () => {
    if (!captureText.trim() && !parsedProfileData && parsedProfilesArray.length === 0) {
      alert("Please add some notes or parse LinkedIn profile(s)!");
      return;
    }

    setIsProcessing(true);
    setShowRawNotes(false);

    try {
      // Call OpenAI API to structure only the user's notes (not LinkedIn data)
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/organize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ 
          rawText: captureText,
          contextType: contextType,
          persistentEvent: persistentEvent || null,
          sectionName: sectionName || null,
          panelParticipants: panelParticipants || null,
          linkedInUrls: linkedInUrls || null,
          companyLinkedInUrls: companyLinkedInUrls || null,
          parsedProfileData: parsedProfileData, // Single profile
          parsedProfilesArray: parsedProfilesArray.length > 0 ? parsedProfilesArray : null, // Multiple profiles
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to organize notes");
      }

      const data = await response.json();
      setAiPreview(data);
      setEditedPreview(JSON.parse(JSON.stringify(data))); // Set up for editing immediately
      
      // Get the notes without date (date will be displayed separately)
      const rawNotes = captureText.split('---')[1]?.trim() || captureText.split('Add your notes below:')[1]?.trim() || captureText;
      setEditedMainNotes(rawNotes);
      
      setIsEditingPreview(true); // Go straight to edit mode
      setShowRawNotes(false);
    } catch (error) {
      console.error("Error organizing notes:", error);
      alert("Failed to organize notes. Please try again.");
      setShowRawNotes(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDirectSave = async () => {
    setIsProcessing(true);
    try {
      // Build structured data from form fields
      const structuredData = {
        people: [{
          name: personName,
          company: personCompany,
          role: personRole,
          linkedin_url: linkedInUrls,
          company_linkedin_url: companyLinkedInUrls,
        }],
        additional_notes: editedPreview?.additional_notes || [],
        follow_ups: editedPreview?.follow_ups || [],
        context_type: contextType,
      };

      // Get auth token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log("💾 Save attempt - Session check:", { 
        hasSession: !!session, 
        hasToken: !!session?.access_token,
        sessionError 
      });
      
      if (!session) {
        alert("Please sign in to save contacts. You may need to refresh the page after signing in.");
        setIsProcessing(false);
        return;
      }

      console.log("💾 Sending save request with token (first 20 chars):", session.access_token.substring(0, 20) + "...");

      // Save to Supabase
      const response = await fetch("/api/save-memory", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          rawText: captureText,
          structuredData: structuredData,
        }),
      });
      
      console.log("💾 Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Save failed:", errorData);
        throw new Error(errorData.error || "Failed to save contact");
      }

      // Clear form and reset
      setCaptureText("");
      setEditedMainNotes("");
      setNoteCount(0);
      setAiPreview(null);
      setShowRawNotes(true);
      setPersonName("");
      setPersonCompany("");
      setPersonRole("");
      setEditedPreview(null);
      setIsEditingPreview(false);
      setLinkedInProfilePaste("");
      setLinkedInUrls("");
      setCompanyLinkedInUrls("");
      
      // Refresh people list
      await fetchPeople();
      
      alert("Contact saved successfully! Check the Library on the right.");
    } catch (error) {
      console.error("Error saving contact:", error);
      alert("Failed to save contact. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveAndSave = async (dataToSave?: any) => {
    setIsProcessing(true);
    try {
      // Use provided data or fall back to editedPreview (if available) or aiPreview
      // If none exist, create basic structure from manual fields
      let finalData = dataToSave || editedPreview || aiPreview;
      
      console.log("🔍 Raw finalData:", finalData);
      
      // If no structured data exists, create it from manual fields
      if (!finalData && personName.trim()) {
        finalData = {
          people: [{
            name: personName,
            company: personCompany,
            role: personRole,
            location: personLocation,
            interests: personInterests ? personInterests.split(',').map(i => i.trim()).filter(Boolean) : [],
          }],
          conversations: [],
          follow_ups: [],
          memories: []
        };
      }
      
      if (!finalData) {
        alert("Please enter at least a person's name.");
        setIsProcessing(false);
        return;
      }
      
      console.log("💾 Saving data:", finalData);
      console.log("📝 Person ID for update:", loadedPersonId);
      console.log("🔗 LinkedIn URLs:", { linkedInUrls, companyLinkedInUrls });
      console.log("📋 Conversations count:", finalData.additional_notes?.length || 0);
      console.log("🎭 Memories count:", finalData.memories?.length || 0);
      
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Please sign in to save.");
        setIsProcessing(false);
        return;
      }
      
      // Ensure LinkedIn URLs, relationship data, and interests are in the person data
      if (finalData.people && finalData.people.length > 0) {
        finalData.people[0].linkedin_url = linkedInUrls;
        finalData.people[0].company_linkedin_url = companyLinkedInUrls;
        finalData.people[0].relationship_circle = relationshipCircle;
        finalData.people[0].interaction_details = interactionDetails;
        finalData.people[0].interests = personInterests ? personInterests.split(',').map((i: string) => i.trim()).filter(Boolean) : [];
      }
      
      // Filter out existing items - only send NEW ones to avoid duplicates
      // EXCEPT for follow-ups - send ALL follow-ups since backend deletes and replaces them
      const newConversations = (finalData.additional_notes || []).filter((note: any) => !note.isExisting);
      const newMemories = (finalData.memories || []).filter((mem: any) => !mem.isExisting);
      const allFollowUps = (finalData.follow_ups || []); // Send ALL follow-ups (new and existing)
      
      console.log("📊 All conversations:", finalData.additional_notes);
      console.log("🆕 NEW Conversations to save:", newConversations.length, newConversations);
      console.log("🆕 NEW Memories to save:", newMemories.length, newMemories);
      console.log("📋 ALL Follow-ups to save:", allFollowUps.length, allFollowUps);
      console.log("📦 Existing memory IDs (will keep):", loadedMemoryIds.length);
      
      // Create payload with NEW conversations/memories, but ALL follow-ups
      const savePayload = {
        ...finalData,
        additional_notes: newConversations,
        memories: newMemories,
        follow_ups: allFollowUps
      };
      
      // Save to Supabase (only NEW memories/conversations, not existing ones)
      const response = await fetch("/api/save-memory", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          rawText: editedMainNotes || captureText, // General notes
          structuredData: savePayload, // Only NEW conversations and memories
          personId: loadedPersonId, // Pass the ID if updating existing person
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error Response:", errorData);
        throw new Error(errorData.error || "Failed to save memory");
      }

      // Clear form and reset ALL state
      setCaptureText("");
      setEditedMainNotes("");
      setNoteCount(0);
      setAiPreview(null);
      setEditedPreview(null);
      setIsEditingPreview(false);
      setShowRawNotes(true);
      setPersonName("");
      setPersonCompany("");
      setPersonRole("");
      setPersonLocation("");
      setLinkedInProfilePaste("");
      setLinkedInUrls("");
      setCompanyLinkedInUrls("");
      setLoadedPersonId(null); // Clear the loaded person ID
      setLoadedMemoryIds([]); // Clear the loaded memory IDs
      
      // Collapse all sections
      setExpandedSections({
        context: false,
        linkedin: false,
        conversations: false,
        followups: false,
        memories: false,
        research: false,
      });
      
      // Refresh people list
      await fetchPeople();
      
      alert("Contact saved successfully! Check the Library on the right.");
    } catch (error) {
      console.error("Error saving memory:", error);
      alert("Failed to save memory. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditPreview = () => {
    setIsEditingPreview(true);
    setEditedPreview(JSON.parse(JSON.stringify(aiPreview))); // Deep copy
  };

  const handleSavePreviewEdits = () => {
    setAiPreview(editedPreview);
    setIsEditingPreview(false);
  };

  const handleCancelPreviewEdit = () => {
    setIsEditingPreview(false);
    setEditedPreview(null);
  };

  const handleDeletePerson = async (personId: string) => {
    try {
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Please sign in to delete.");
        return;
      }

      console.log("Deleting person:", personId);
      const response = await fetch(`/api/delete-person/${personId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      });

      console.log("Delete response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Delete API error:", errorData);
        console.error("Response status:", response.status, response.statusText);
        throw new Error(errorData.error || `Failed to delete person (${response.status})`);
      }

      // Refresh the people list
      await fetchPeople();
      alert("Person deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting person:", error);
      alert(error.message || "Failed to delete person. Please try again.");
    }
  };

  const handleParseLinkedInProfile = async () => {
    if (!linkedInProfilePaste.trim()) {
      alert("Please paste a LinkedIn profile first!");
      return;
    }

    setIsParsing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/parse-linkedin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ profileText: linkedInProfilePaste }),
      });

      if (!response.ok) {
        throw new Error("Failed to parse LinkedIn profile");
      }

      const data = await response.json();
      setParsedProfileData(data);
      
      // Auto-fill person info fields
      setPersonName(data.name || "");
      setPersonCompany(data.company || "");
      setPersonRole(data.role || "");
      
      // Clear the paste field
      setLinkedInProfilePaste("");
      
      // Auto-organize with AI to populate background fields
      setIsProcessing(true);
      setIsParsing(false); // Done parsing, now organizing
      
      try {
        // Create a text summary of the LinkedIn profile for AI to process
        const profileSummary = `LinkedIn Profile Data:
Name: ${data.name || 'Unknown'}
Company: ${data.company || 'Unknown'}
Role: ${data.role || 'Unknown'}
${data.follower_count ? `Followers: ${data.follower_count}` : ''}

About: ${data.about || 'No about section'}

Experience:
${data.experience?.map((exp: any) => `- ${exp.role} at ${exp.company} (${exp.dates})`).join('\n') || 'No experience listed'}

Education:
${data.education?.map((edu: any) => `- ${edu.school}${edu.degree ? ` - ${edu.degree}` : ''}`).join('\n') || 'No education listed'}

Skills: ${data.skills?.join(', ') || 'No skills listed'}

${captureText ? `\nAdditional Notes:\n${captureText}` : ''}`;

        const organizeResponse = await fetch("/api/organize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({ 
            rawText: profileSummary,
            contextType: contextType,
            persistentEvent: persistentEvent || null,
            sectionName: sectionName || null,
            panelParticipants: panelParticipants || null,
            linkedInUrls: linkedInUrls || null,
            companyLinkedInUrls: companyLinkedInUrls || null,
            parsedProfileData: data,
            parsedProfilesArray: null,
          }),
        });

        if (!organizeResponse.ok) {
          throw new Error("Failed to organize");
        }

        const organizedData = await organizeResponse.json();
        setAiPreview(organizedData);
        setEditedPreview(JSON.parse(JSON.stringify(organizedData)));
        
        // Initialize empty notes for user to add
        setEditedMainNotes("");
        
        setIsEditingPreview(true);
        setShowRawNotes(false);
        
      } catch (orgError) {
        console.error("Error auto-organizing:", orgError);
        alert("Profile parsed but failed to auto-organize. You can still add notes and organize manually.");
      }
      
    } catch (error) {
      console.error("Error parsing LinkedIn profile:", error);
      alert("Failed to parse LinkedIn profile. Please try again.");
      setIsParsing(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleParseLinkedInUrls = async () => {
    const urls = linkedInUrls.split('\n').filter(url => url.trim());
    
    if (urls.length === 0) {
      alert("Please paste LinkedIn URLs (one per line)!");
      return;
    }

    setIsParsingUrls(true);
    const parsedProfiles: any[] = [];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      for (const url of urls) {
        const response = await fetch("/api/parse-linkedin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({ 
            profileText: `LinkedIn URL: ${url.trim()}`,
            isUrl: true 
          }),
        });

        if (response.ok) {
          const data = await response.json();
          data.linkedin_url = url.trim();
          parsedProfiles.push(data);
        }
      }

      setParsedProfilesArray(parsedProfiles);
      
      const names = parsedProfiles.map(p => p.name || 'Unknown').join(', ');
      alert(`✅ Parsed ${parsedProfiles.length} profiles:\n${names}\n\nAdd your panel notes below, then click "Organize with AI" to save all.`);
      
    } catch (error) {
      console.error("Error parsing LinkedIn URLs:", error);
      alert("Failed to parse some LinkedIn URLs. Please try again.");
    } finally {
      setIsParsingUrls(false);
    }
  };

  const contextTypes = [
    { value: "event", label: "Event/Conference", icon: Calendar },
    { value: "business", label: "Business Meeting", icon: CheckSquare },
    { value: "colleague", label: "Colleague", icon: Users },
    { value: "friends", label: "Friends", icon: Users },
    { value: "family", label: "Family", icon: Users },
  ];

  const sections: { value: Section; label: string }[] = [
    { value: "all", label: "All" },
    { value: "personal", label: "Personal" },
    { value: "business", label: "Business" },
    { value: "projects", label: "Projects" },
    { value: "relationships", label: "Relationships" },
    { value: "todos", label: "ToDos" },
    { value: "events", label: "Events" },
    { value: "trips", label: "Trips" },
  ];

  // Mock data
  const mockPeople = [
    {
      id: 1,
      name: "Sarah Chen",
      company: "FinTech Innovations",
      role: "VP Product",
      tags: ["business", "events"],
      inspiration: "high",
      lastMet: "2 days ago",
    },
    {
      id: 2,
      name: "Marcus Johnson",
      company: "CloudScale AI",
      role: "CTO",
      tags: ["business", "projects"],
      inspiration: "medium",
      lastMet: "1 week ago",
    },
  ];

  const mockEvents = [
    {
      id: 1,
      name: "YC Mixer - SF",
      date: "Nov 28, 2025",
      peopleCount: 5,
      tags: ["business", "events"],
    },
    {
      id: 2,
      name: "Miami Tech Week",
      date: "Nov 15, 2025",
      peopleCount: 12,
      tags: ["business", "trips"],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Global Mode Header */}
      <GlobalModeHeader />

      {/* Main Split Screen */}
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[calc(100vh-120px)]">
          {/* Left: Capture Section */}
          <Card className="bg-white border-gray-200 shadow-sm p-6">
            {/* Person Info with Buttons - Always Visible */}
            <PersonInfoCard
              personName={personName}
              personCompany={personCompany}
              personRole={personRole}
              personLocation={personLocation}
              personInterests={personInterests}
              onPersonNameChange={setPersonName}
              onPersonCompanyChange={setPersonCompany}
              onPersonRoleChange={setPersonRole}
              onPersonLocationChange={setPersonLocation}
              onPersonInterestsChange={setPersonInterests}
              onClear={() => {
                setCaptureText("");
                setAiPreview(null);
                setEditedPreview(null);
                setIsEditingPreview(false);
                setPersonName("");
                setPersonCompany("");
                setPersonRole("");
                setPersonLocation("");
                setPersonInterests("");
                setRelationshipCircle(null);
                setInteractionDetails([]);
                setAdditionalFields([]);
                setShowAdditionalDetails(false);
                setLinkedInProfilePaste("");
                setLinkedInUrls("");
                setCompanyLinkedInUrls("");
                setPersistentEvent("");
                setSectionName("");
                setPanelParticipants("");
              }}
            />

            {/* Preview Sections - Always Visible */}
            <SectionManager
              sections={sectionConfig}
              setSections={setSectionConfig}
              expandedSections={expandedSections}
              onToggleSection={toggleSection}
              editedPreview={editedPreview}
              setEditedPreview={setEditedPreview}
              personName={personName}
              personCompany={personCompany}
              personRole={personRole}
              personLocation={personLocation}
              isProcessing={isProcessing}
              handleSavePreviewEdits={handleSavePreviewEdits}
              handleApproveAndSave={handleApproveAndSave}
              setAiPreview={setAiPreview}
              setIsEditingPreview={setIsEditingPreview}
              setShowRawNotes={setShowRawNotes}
              // Context section props
              contextType={contextType}
              setContextType={setContextType}
              persistentEvent={persistentEvent}
              setPersistentEvent={setPersistentEvent}
              showEventInput={showEventInput}
              setShowEventInput={setShowEventInput}
              showSessionFields={showSessionFields}
              setShowSessionFields={setShowSessionFields}
              sectionName={sectionName}
              setSectionName={setSectionName}
              panelParticipants={panelParticipants}
              setPanelParticipants={setPanelParticipants}
              linkedInUrls={linkedInUrls}
              setLinkedInUrls={setLinkedInUrls}
              companyLinkedInUrls={companyLinkedInUrls}
              setCompanyLinkedInUrls={setCompanyLinkedInUrls}
              linkedInProfilePaste={linkedInProfilePaste}
              setLinkedInProfilePaste={setLinkedInProfilePaste}
              handleParseLinkedInProfile={handleParseLinkedInProfile}
              isParsing={isParsing}
              isRecording={isRecording}
              onToggleRecording={handleMicClick}
              personId={loadedPersonId || undefined}
              relationshipCircle={relationshipCircle}
              setRelationshipCircle={setRelationshipCircle}
              interactionDetails={interactionDetails}
              setInteractionDetails={setInteractionDetails}
            />

            {/* Action Buttons - Disabled, using Save to Rolodex instead */}
            {/* <DirectSaveButton
              aiPreview={aiPreview}
              personName={personName}
              onSave={handleDirectSave}
              isProcessing={isProcessing}
            /> */}
          </Card>

          {/* Right: Library Section */}
          <Card className="bg-white border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Library</h2>

            {/* Section Filter */}
            <div className="mb-6 flex flex-wrap gap-2">
              {sections.map((section) => (
                <Badge
                  key={section.value}
                  variant={activeSection === section.value ? "default" : "outline"}
                  className={`cursor-pointer transition-all ${
                    activeSection === section.value
                      ? "bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-200"
                      : "border-gray-300 bg-white hover:bg-gray-50 text-gray-600"
                  }`}
                  onClick={() => setActiveSection(section.value)}
                >
                  {section.label}
                </Badge>
              ))}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="people" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-100">
                <TabsTrigger value="people" className="data-[state=active]:bg-white data-[state=active]:text-blue-700">
                  <Users className="mr-2 h-4 w-4" />
                  People
                </TabsTrigger>
                <TabsTrigger value="events" className="data-[state=active]:bg-white data-[state=active]:text-blue-700">
                  <Calendar className="mr-2 h-4 w-4" />
                  Events
                </TabsTrigger>
                <TabsTrigger value="followups" className="data-[state=active]:bg-white data-[state=active]:text-blue-700">
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Follow-ups
                </TabsTrigger>
              </TabsList>

              {/* People Tab */}
              <TabsContent value="people" className="space-y-4 mt-4">
                {/* Search and Sort */}
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="Search people..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={sortPeopleBy}
                    onChange={(e) => setSortPeopleBy(e.target.value as 'name' | 'date-added' | 'company')}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="date-added">Recently Added</option>
                    <option value="name">Name (A-Z)</option>
                    <option value="company">Company</option>
                  </select>
                </div>

                {/* Relationship Circle Filters */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-xs text-gray-500 self-center">Relationship:</span>
                  <Badge 
                    variant={relationshipFilter === 'all' ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => setRelationshipFilter('all')}
                  >
                    All
                  </Badge>
                  <Badge 
                    variant={relationshipFilter === 'inner_circle' ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-pink-100 border-pink-300"
                    onClick={() => setRelationshipFilter('inner_circle')}
                  >
                    ❤️ Inner Circle
                  </Badge>
                  <Badge 
                    variant={relationshipFilter === 'professional' ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-blue-100 border-blue-300"
                    onClick={() => setRelationshipFilter('professional')}
                  >
                    💼 Professional
                  </Badge>
                  <Badge 
                    variant={relationshipFilter === 'genuine_interest' ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-purple-100 border-purple-300"
                    onClick={() => setRelationshipFilter('genuine_interest')}
                  >
                    👥 Genuine Interest
                  </Badge>
                  <Badge 
                    variant={relationshipFilter === 'acquaintance' ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-green-100 border-green-300"
                    onClick={() => setRelationshipFilter('acquaintance')}
                  >
                    🙋 Acquaintance
                  </Badge>
                  <Badge 
                    variant={relationshipFilter === 'brief_encounter' ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-yellow-100 border-yellow-300"
                    onClick={() => setRelationshipFilter('brief_encounter')}
                  >
                    ☕ Brief Encounter
                  </Badge>
                  <Badge 
                    variant={relationshipFilter === 'not_met' ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-gray-100 border-gray-300"
                    onClick={() => setRelationshipFilter('not_met')}
                  >
                    👁️ Not Met Yet
                  </Badge>
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handlePeopleDragEnd}
                >
                  <SortableContext
                    items={people
                      .filter(p => relationshipFilter === 'all' || p.relationship_circle === relationshipFilter)
                      .map(p => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {people
                      .filter(p => relationshipFilter === 'all' || p.relationship_circle === relationshipFilter)
                      .sort((a, b) => {
                        switch (sortPeopleBy) {
                          case 'name':
                            return a.name.localeCompare(b.name);
                          case 'company':
                            return (a.company || '').localeCompare(b.company || '');
                          case 'date-added':
                          default:
                            return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
                        }
                      })
                      .map((person) => (
                        <SortablePersonCard key={person.id} person={person} onLoad={loadPersonIntoForm} onDelete={handleDeletePerson} />
                      ))}
                  </SortableContext>
                </DndContext>
              </TabsContent>

              {/* Events Tab */}
              <TabsContent value="events" className="space-y-4 mt-4">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleEventsDragEnd}
                >
                  <SortableContext
                    items={events.map(e => e.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {events.map((event) => (
                      <SortableEventCard key={event.id} event={event} />
                    ))}
                  </SortableContext>
                </DndContext>
              </TabsContent>

              {/* Follow-ups Tab */}
              <TabsContent value="followups" className="space-y-4 mt-4">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleFollowUpsDragEnd}
                >
                  <SortableContext
                    items={followUps.map(f => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {followUps.map((followUp) => (
                      <SortableFollowUpCard key={followUp.id} followUp={followUp} />
                    ))}
                  </SortableContext>
                </DndContext>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
