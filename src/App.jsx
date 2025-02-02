import { useState, useEffect, useRef } from "react";
import { supabase } from "../supbaseClient";

function App() {
  const [session, setSession] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [usersOnline, setUsersOnline] = useState([]);

  const chatContainerReft = useRef(null);
  const scroll = useRef(null);

  useEffect(() => {}, []);

  const SignIn = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google" });
  };

  const SignOut = async () => {
    const { error } = await supabase.auth.signOut();
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  console.log(session);

  useEffect(() => {
    if (!session?.user) {
      setUsersOnline([]);
      return;
    }

    const roomOne = supabase.channel("room-one", {
      config: {
        presence: {
          key: session?.user?.id,
        },
      },
    });

    roomOne.on("broadcast", { event: "message" }, (payload) => {
      setMessages((prev) => [...prev, payload.payload]);
      console.log(messages);
    });

    roomOne
      .on("broadcast", { event: "cursor-pos" }, (payload) => {
        console.log("Cursor position received!", payload);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          roomOne.send({
            type: "broadcast",
            event: "cursor-pos",
            payload: { x: Math.random(), y: Math.random() },
          });
        }
      });

    // handle user presence
    roomOne.on("presence", { event: "sync" }, () => {
      const state = roomOne.presenceState();
      setUsersOnline(Object.keys(state));
    });

    return () => {
      roomOne.unsubscribe();
    };
  }, [session]);

  // send message

  const sendMessage = async (e) => {
    e.preventDefault();
    supabase.channel("room-one").send({
      type: "broadcast",
      event: "message",
      payload: {
        message: newMessage,
        user_name: session?.user?.user_metadata?.email,
        avatar: session?.user?.user_metadata?.avatar_url,
        timestamp: new Date().toISOString(),
      },
    });
    setNewMessage("");
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  useEffect(() => {
    setTimeout(() => {
      if (chatContainerReft.current) {
        chatContainerReft.current.scrollTop =
          chatContainerReft.current.scrollHeight;
      }
    }, 100);
  }, [messages]);

  if (!session) {
    return (
      <div className="w-full flex h-screen justify-center items-center">
        <button onClick={SignIn}>Sign in with Google</button>
      </div>
    );
  } else {
    return (
      <div className="w-full flex h-screen justify-center items-center p-4">
        <div className="border-[1px] border-gray-700 max-w-6xl w-full min-h-[600px] rounded-lg">
          {/* Header */}
          <div className="flex justify-between border-b-[1px] border-gray-700">
            <div className="p-4">
              <p className="text-gray-300">
                Signed in as {session?.user?.user_metadata?.full_name}
              </p>
              <p className="text-gray-300 italic text-sm">
                {usersOnline.length} users online
              </p>
            </div>
            <button className="m-2 sm:mr-4" onClick={SignOut}>
              Sign out
            </button>
          </div>
          {/* main chat */}
          <div ref={chatContainerReft} className="p-4 flex flex-col overflow-y-auto h-[500px]">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`my-2 flex w-full items-start ${
                  msg?.user_name === session?.user?.email
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                {/* received message avatar - left */}
                {msg?.user_name !== session?.user?.email && (
                  <img
                    src={msg.avatar}
                    alt="/"
                    className="w-10 h-10 rounded-full mr-2"
                  ></img>
                )}
                <div className="flex flex-col w-full">
                  <div
                    className={`p-1 max-w-[70%] rounded-xl ${
                      msg?.user_name === session?.user?.email
                        ? "bg-blue-500 text-white ml-auto"
                        : "bg-gray-700 text-white ml-auto"
                    }`}
                  >
                    <p>{msg.message}</p>
                  </div>
                  {/* timestamp */}
                  <div
                    className={`text-xs opacity-75 pt-1 ${
                      msg?.user_name === session?.user?.email
                        ? "text-right mr-2"
                        : "text-left ml-2"
                    }`}
                  >
                    {formatTime(msg?.timestamp)}
                  </div>
                </div>
                {msg?.user_name === session?.user?.email && (
                  <img
                    src={msg.avatar}
                    alt="/"
                    className="w-10 h-10 rounded-full ml-2"
                  ></img>
                )}
              </div>
            ))}
          </div>
          {/* message input */}
          <form
            className="flex flex-col sm:flex-row p-4 border-t-[1px] border-gray-700"
            onSubmit={sendMessage}
          >
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              type="text"
              placeholder="Type a message..."
              className="w-full p-2 border-[1px] border-gray-700 rounded-lg"
            />
            <button className="mt-4 sm:mt-0 sm:ml-8 bg-blue-500 text-white">
              Send
            </button>
            <span ref={scroll}></span>
          </form>
        </div>
      </div>
    );
  }
}

export default App;
